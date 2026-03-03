using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Azure.Core;
using Azure.Identity;
using ChessMate.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ChessMate.Infrastructure.BatchCoach;

public sealed class AzureOpenAiCoachMoveGenerator : ICoachMoveGenerator
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private static readonly TokenRequestContext CognitiveServiceTokenContext = new( new string[] { "https://cognitiveservices.azure.com/.default"});

    private readonly HttpClient _httpClient;
    private readonly IOptions<BackendOptions> _backendOptions;
    private readonly TimeProvider _timeProvider;
    private readonly TokenCredential _tokenCredential;
    private readonly ILogger<AzureOpenAiCoachMoveGenerator> _logger;

    public AzureOpenAiCoachMoveGenerator(
        HttpClient httpClient,
        IOptions<BackendOptions> backendOptions,
        TimeProvider timeProvider,
        ILogger<AzureOpenAiCoachMoveGenerator> logger)
    {
        _httpClient = httpClient;
        _backendOptions = backendOptions;
        _timeProvider = timeProvider;
        _logger = logger;
        _tokenCredential = new DefaultAzureCredential();
    }

    public async Task<CoachGenerationResult> GenerateAsync(CoachMoveGenerationRequest request, CancellationToken cancellationToken)
    {
        var openAiOptions = _backendOptions.Value.AzureOpenAi;
        ValidateOptions(openAiOptions);

        var rolePhrase = CoachMovePromptComposer.CreateRolePhrase(request.IsUserMove);
        var moveText = CoachMovePromptComposer.CreateMoveText(request);
        var promptVerbosity = CoachMovePromptComposer.NormalizePromptVerbosity(request.PromptVerbosity);
        var systemPrompt = CoachMovePromptComposer.ComposeSystemPrompt(promptVerbosity);
        var tacticalAnnotation = TacticalAnnotator.Annotate(request.FenAfter, request.From, request.To);
        var userPrompt = CoachMovePromptComposer.ComposeUserPrompt(request, rolePhrase, moveText, tacticalAnnotation);
        var boardAfter = BoardSnapshot.TryParse(request.FenAfter);
        var requestUri = BuildRequestUri(openAiOptions);

        var wallClockStart = _timeProvider.GetTimestamp();
        var accumulatedPromptTokens = 0;
        var accumulatedCompletionTokens = 0;
        var accumulatedTotalTokens = 0;
        var regenerationAttempts = 0;
        var softenedClaims = 0;
        var validationFailures = 0;

        var completion = await GenerateCompletionWithRetryAsync(
            openAiOptions,
            requestUri,
            systemPrompt,
            userPrompt,
            cancellationToken);

        accumulatedPromptTokens += completion.Usage?.PromptTokens ?? 0;
        accumulatedCompletionTokens += completion.Usage?.CompletionTokens ?? 0;
        accumulatedTotalTokens += completion.Usage?.TotalTokens ?? 0;

        var sections = ParseSections(completion.Choices?.FirstOrDefault()?.Message?.Content
            ?? throw new InvalidOperationException("Azure OpenAI response did not contain message content."));

        var validation = CoachResponseValidator.Validate(
            sections.WhyWrong,
            sections.ExploitPath,
            sections.SuggestedPlan,
            boardAfter,
            tacticalAnnotation);

        if (!validation.IsValid)
        {
            validationFailures++;

            _logger.LogWarning(
                "Coach response validation failed. OperationId {OperationId}, Ply {Ply}, Contradictions {Contradictions}, AbsoluteIndicators {AbsoluteIndicators}.",
                request.OperationId,
                request.Ply,
                string.Join("; ", validation.Contradictions),
                string.Join("; ", validation.AbsoluteClaimIndicators));

            if (validation.HasContradictions)
            {
                regenerationAttempts = 1;

                var strongerPrompt = CoachMovePromptComposer.ComposeSystemPrompt(promptVerbosity, strongerGrounding: true);
                var strongerUserPrompt = BuildRegenerationUserPrompt(userPrompt, validation.Contradictions);

                var regeneratedCompletion = await GenerateCompletionWithRetryAsync(
                    openAiOptions,
                    requestUri,
                    strongerPrompt,
                    strongerUserPrompt,
                    cancellationToken);

                accumulatedPromptTokens += regeneratedCompletion.Usage?.PromptTokens ?? 0;
                accumulatedCompletionTokens += regeneratedCompletion.Usage?.CompletionTokens ?? 0;
                accumulatedTotalTokens += regeneratedCompletion.Usage?.TotalTokens ?? 0;
                completion = regeneratedCompletion;

                sections = ParseSections(regeneratedCompletion.Choices?.FirstOrDefault()?.Message?.Content
                    ?? throw new InvalidOperationException("Azure OpenAI regeneration did not contain message content."));

                validation = CoachResponseValidator.Validate(
                    sections.WhyWrong,
                    sections.ExploitPath,
                    sections.SuggestedPlan,
                    boardAfter,
                    tacticalAnnotation);

                if (!validation.IsValid)
                {
                    validationFailures++;
                }
            }

            if (validation.HasAbsoluteClaimRisk)
            {
                var (softenedWhy, whyChanged) = SoftenAbsoluteClaims(sections.WhyWrong);
                var (softenedExploit, exploitChanged) = SoftenAbsoluteClaims(sections.ExploitPath);
                var (softenedPlan, planChanged) = SoftenAbsoluteClaims(sections.SuggestedPlan);

                if (whyChanged)
                {
                    softenedClaims++;
                }

                if (exploitChanged)
                {
                    softenedClaims++;
                }

                if (planChanged)
                {
                    softenedClaims++;
                }

                sections = new CoachSections(softenedWhy, softenedExploit, softenedPlan);
            }
        }

        var elapsed = _timeProvider.GetElapsedTime(wallClockStart).TotalMilliseconds;

        return new CoachGenerationResult(
            sections.WhyWrong,
            sections.ExploitPath,
            sections.SuggestedPlan,
            CoachMovePromptComposer.ComposeExplanation(rolePhrase, moveText, sections.WhyWrong, sections.ExploitPath, sections.SuggestedPlan),
            accumulatedPromptTokens,
            accumulatedCompletionTokens,
            accumulatedTotalTokens,
            regenerationAttempts,
            softenedClaims,
            validationFailures,
            elapsed,
            string.IsNullOrWhiteSpace(completion.Model) ? openAiOptions.ModelName : completion.Model!);
    }

    private async Task<AzureOpenAiCompletionResponse> GenerateCompletionWithRetryAsync(
        AzureOpenAiOptions openAiOptions,
        string requestUri,
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken)
    {
        var attempts = Math.Max(openAiOptions.Retry.MaxAttempts, 1);

        for (var attempt = 1; attempt <= attempts; attempt++)
        {
            try
            {
                using var httpRequest = await BuildRequestMessageAsync(
                    openAiOptions,
                    requestUri,
                    systemPrompt,
                    userPrompt,
                    cancellationToken);

                using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);

                if (IsTransientStatusCode(response.StatusCode) && attempt < attempts)
                {
                    await DelayForRetryAsync(openAiOptions.Retry, attempt, cancellationToken);
                    continue;
                }

                response.EnsureSuccessStatusCode();
                await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
                var completion = await JsonSerializer.DeserializeAsync<AzureOpenAiCompletionResponse>(
                    responseStream,
                    SerializerOptions,
                    cancellationToken);

                if (completion is null)
                {
                    throw new InvalidOperationException("Azure OpenAI response payload could not be deserialized.");
                }

                return completion;
            }
            catch (HttpRequestException exception) when (IsTransientStatusCode(exception.StatusCode) && attempt < attempts)
            {
                _logger.LogWarning(
                    exception,
                    "Azure OpenAI transient HTTP failure. attempt {Attempt}/{Attempts}.",
                    attempt,
                    attempts);

                await DelayForRetryAsync(openAiOptions.Retry, attempt, cancellationToken);
            }
            catch (TaskCanceledException exception) when (!cancellationToken.IsCancellationRequested && attempt < attempts)
            {
                _logger.LogWarning(
                    exception,
                    "Azure OpenAI timeout on attempt {Attempt}/{Attempts}.",
                    attempt,
                    attempts);

                await DelayForRetryAsync(openAiOptions.Retry, attempt, cancellationToken);
            }
        }

        throw new InvalidOperationException("Azure OpenAI coaching call failed after the configured retry attempts.");
    }

    private static string BuildRegenerationUserPrompt(string userPrompt, IReadOnlyList<string> contradictions)
    {
        if (contradictions.Count == 0)
        {
            return userPrompt;
        }

        var builder = new StringBuilder(userPrompt);
        builder.AppendLine();
        builder.AppendLine();
        builder.AppendLine("Regeneration guardrails:");
        builder.AppendLine("- The prior answer included unsupported claims. Correct them and stay strictly grounded.");
        foreach (var contradiction in contradictions)
        {
            builder.AppendLine($"- Avoid unsupported claim: {contradiction}");
        }

        return builder.ToString();
    }

    private static (string Text, bool Changed) SoftenAbsoluteClaims(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return (input, false);
        }

        var softened = input;
        softened = Regex.Replace(softened, "\\balways\\b", "often", RegexOptions.IgnoreCase);
        softened = Regex.Replace(softened, "\\bnever\\b", "rarely", RegexOptions.IgnoreCase);
        softened = Regex.Replace(softened, "\\bdefinitely\\b", "likely", RegexOptions.IgnoreCase);
        softened = Regex.Replace(softened, "\\bcertainly\\b", "likely", RegexOptions.IgnoreCase);
        softened = Regex.Replace(softened, "\\bguaranteed\\b", "likely", RegexOptions.IgnoreCase);
        softened = Regex.Replace(softened, "\\bforced\\s+win\\b", "strong practical advantage", RegexOptions.IgnoreCase);
        softened = Regex.Replace(softened, "\\bcompletely\\s+winning\\b", "clearly preferable", RegexOptions.IgnoreCase);
        softened = Regex.Replace(softened, "\\bcannot\\s+be\\s+stopped\\b", "is difficult to stop", RegexOptions.IgnoreCase);

        return (softened, !string.Equals(input, softened, StringComparison.Ordinal));
    }

    private static void ValidateOptions(AzureOpenAiOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Endpoint))
        {
            throw new InvalidOperationException("ChessMate:AzureOpenAi:Endpoint is required.");
        }

        if (string.IsNullOrWhiteSpace(options.DeploymentName))
        {
            throw new InvalidOperationException("ChessMate:AzureOpenAi:DeploymentName is required.");
        }

        if (string.IsNullOrWhiteSpace(options.ApiVersion))
        {
            throw new InvalidOperationException("ChessMate:AzureOpenAi:ApiVersion is required.");
        }
    }

    private static string BuildRequestUri(AzureOpenAiOptions options)
    {
        var endpoint = options.Endpoint.TrimEnd('/');
        var deployment = Uri.EscapeDataString(options.DeploymentName);
        var apiVersion = Uri.EscapeDataString(options.ApiVersion);
        return $"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={apiVersion}";
    }

    private async Task<HttpRequestMessage> BuildRequestMessageAsync(
        AzureOpenAiOptions options,
        string requestUri,
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken)
    {
        var body = new AzureOpenAiCompletionRequest(new List<AzureOpenAiChatMessage>
            {
                new("system", systemPrompt),
                new("user", userPrompt)
            },
            options.MaxOutputTokens,
            options.Temperature,
            new AzureOpenAiResponseFormat("json_object"));

        var request = new HttpRequestMessage(HttpMethod.Post, requestUri)
        {
            Content = new StringContent(JsonSerializer.Serialize(body, SerializerOptions), Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(options.ApiKey))
        {
            request.Headers.Add("api-key", options.ApiKey);
            return request;
        }

        var token = await _tokenCredential.GetTokenAsync(CognitiveServiceTokenContext, cancellationToken);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
        return request;
    }

    private static bool IsTransientStatusCode(HttpStatusCode statusCode)
    {
        return statusCode == HttpStatusCode.TooManyRequests ||
               statusCode == HttpStatusCode.RequestTimeout ||
               statusCode == HttpStatusCode.BadGateway ||
               statusCode == HttpStatusCode.ServiceUnavailable ||
               statusCode == HttpStatusCode.GatewayTimeout ||
               statusCode == HttpStatusCode.InternalServerError;
    }

    private static bool IsTransientStatusCode(HttpStatusCode? statusCode)
    {
        return statusCode is not null && IsTransientStatusCode(statusCode.Value);
    }

    private static async Task DelayForRetryAsync(AzureOpenAiRetryOptions options, int attempt, CancellationToken cancellationToken)
    {
        var baseDelay = Math.Max(options.BaseDelayMilliseconds, 100);
        var maxDelay = Math.Max(options.MaxDelayMilliseconds, baseDelay);
        var multiplier = Math.Pow(2, Math.Max(attempt - 1, 0));
        var computedDelay = Math.Min((int)(baseDelay * multiplier), maxDelay);
        await Task.Delay(TimeSpan.FromMilliseconds(computedDelay), cancellationToken);
    }

    private static CoachSections ParseSections(string content)
    {
        var sanitized = SanitizeJsonContent(content);

        using var document = JsonDocument.Parse(sanitized);
        var root = document.RootElement;
        var whyWrong = GetRequiredField(root, "whyWrong");
        var exploitPath = GetRequiredField(root, "exploitPath");
        var suggestedPlan = GetRequiredField(root, "suggestedPlan");

        return new CoachSections(whyWrong, exploitPath, suggestedPlan);
    }

    private static string SanitizeJsonContent(string content)
    {
        var trimmed = content.Trim();
        if (!trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            return trimmed;
        }

        var withoutFence = trimmed
            .Replace("```json", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("```", string.Empty, StringComparison.Ordinal)
            .Trim();

        return withoutFence;
    }

    private static string GetRequiredField(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var property) || property.ValueKind != JsonValueKind.String)
        {
            throw new InvalidOperationException($"Azure OpenAI response is missing required field '{propertyName}'.");
        }

        var value = property.GetString();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"Azure OpenAI field '{propertyName}' must be non-empty.");
        }

        return value.Trim();
    }

    private sealed record CoachSections(string WhyWrong, string ExploitPath, string SuggestedPlan);

    private sealed record AzureOpenAiCompletionRequest(
        [property: JsonPropertyName("messages")]
        IReadOnlyList<AzureOpenAiChatMessage> Messages,

        [property: JsonPropertyName("max_tokens")]
        int MaxTokens,

        [property: JsonPropertyName("temperature")]
        decimal Temperature,

        [property: JsonPropertyName("response_format")]
        AzureOpenAiResponseFormat ResponseFormat);

    private sealed record AzureOpenAiChatMessage(
        [property: JsonPropertyName("role")]
        string Role,

        [property: JsonPropertyName("content")]
        string Content);

    private sealed record AzureOpenAiResponseFormat(
        [property: JsonPropertyName("type")]
        string Type);

    private sealed record AzureOpenAiCompletionResponse(
        [property: JsonPropertyName("model")]
        string? Model,

        [property: JsonPropertyName("choices")]
        IReadOnlyList<AzureOpenAiChoice>? Choices,

        [property: JsonPropertyName("usage")]
        AzureOpenAiUsage? Usage);

    private sealed record AzureOpenAiChoice(
        [property: JsonPropertyName("message")]
        AzureOpenAiMessage? Message);

    private sealed record AzureOpenAiMessage(
        [property: JsonPropertyName("content")]
        string? Content);

    private sealed record AzureOpenAiUsage(
        [property: JsonPropertyName("prompt_tokens")]
        int PromptTokens,

        [property: JsonPropertyName("completion_tokens")]
        int CompletionTokens,

        [property: JsonPropertyName("total_tokens")]
        int TotalTokens);
}
