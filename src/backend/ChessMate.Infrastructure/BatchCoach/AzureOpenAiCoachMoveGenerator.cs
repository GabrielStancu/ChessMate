using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.Core;
using Azure.Identity;
using ChessMate.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ChessMate.Infrastructure.BatchCoach;

public sealed class AzureOpenAiCoachMoveGenerator : ICoachMoveGenerator
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private static readonly TokenRequestContext CognitiveServiceTokenContext =
        new(["https://cognitiveservices.azure.com/.default"]);

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
        var systemPrompt = CoachMovePromptComposer.ComposeSystemPrompt();
        var userPrompt = CoachMovePromptComposer.ComposeUserPrompt(request, rolePhrase, moveText);
        var requestUri = BuildRequestUri(openAiOptions);

        var wallClockStart = _timeProvider.GetTimestamp();
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

                var content = completion?.Choices?.FirstOrDefault()?.Message?.Content;
                if (string.IsNullOrWhiteSpace(content))
                {
                    throw new InvalidOperationException("Azure OpenAI response did not contain message content.");
                }

                var sections = ParseSections(content);
                var elapsed = _timeProvider.GetElapsedTime(wallClockStart).TotalMilliseconds;

                return new CoachGenerationResult(
                    sections.WhyWrong,
                    sections.ExploitPath,
                    sections.SuggestedPlan,
                    CoachMovePromptComposer.ComposeExplanation(rolePhrase, moveText, sections.WhyWrong, sections.ExploitPath, sections.SuggestedPlan),
                    completion?.Usage?.PromptTokens ?? 0,
                    completion?.Usage?.CompletionTokens ?? 0,
                    completion?.Usage?.TotalTokens ?? 0,
                    elapsed,
                    string.IsNullOrWhiteSpace(completion?.Model) ? openAiOptions.ModelName : completion!.Model!);
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
        var body = new AzureOpenAiCompletionRequest(
            [
                new AzureOpenAiChatMessage("system", systemPrompt),
                new AzureOpenAiChatMessage("user", userPrompt)
            ],
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
