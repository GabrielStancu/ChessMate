using System.Net;
using System.Text;
using ChessMate.Infrastructure.BatchCoach;
using ChessMate.Infrastructure.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace ChessMate.Functions.Tests;

public sealed class CoachMovePromptComposerTests
{
    [Fact]
    public void CreateRolePhrase_ReturnsExpectedNarrationPrefix()
    {
        Assert.Equal("You moved", CoachMovePromptComposer.CreateRolePhrase(true));
        Assert.Equal("Opponent moved", CoachMovePromptComposer.CreateRolePhrase(false));
    }

    [Fact]
    public void ComposeExplanation_IncludesRequiredSectionsAndRoleAwarePrefix()
    {
        var explanation = CoachMovePromptComposer.ComposeExplanation(
            "Opponent moved",
            "Nf6",
            "It weakened dark squares.",
            "White can pressure e5.",
            "Stabilize the center first.");

        Assert.StartsWith("Opponent moved Nf6.", explanation, StringComparison.Ordinal);
        Assert.Contains("Why this was wrong:", explanation, StringComparison.Ordinal);
        Assert.Contains("Exploit path:", explanation, StringComparison.Ordinal);
        Assert.Contains("Suggested plan:", explanation, StringComparison.Ordinal);
    }
}

public sealed class AzureOpenAiCoachMoveGeneratorTests
{
    [Fact]
    public async Task GenerateAsync_RetriesTransientFailure_ThenReturnsParsedSectionsAndUsage()
    {
        var handler = new SequenceHttpMessageHandler(
            new HttpResponseMessage(HttpStatusCode.ServiceUnavailable),
            CreateSuccessResponse());

        var httpClient = new HttpClient(handler);
        var options = Options.Create(CreateBackendOptions(maxAttempts: 3));
        var generator = new AzureOpenAiCoachMoveGenerator(
            httpClient,
            options,
            TimeProvider.System,
            NullLogger<AzureOpenAiCoachMoveGenerator>.Instance);

        var request = new CoachMoveGenerationRequest(
            "op-1",
            "game-1",
            "Quick",
            18,
            "Mistake",
            true,
            "Nf3",
            "Knight",
            "g1",
            "f3");

        var result = await generator.GenerateAsync(request, CancellationToken.None);

        Assert.Equal(2, handler.CallCount);
        Assert.Equal("Why text", result.WhyWrong);
        Assert.Equal("Exploit text", result.ExploitPath);
        Assert.Equal("Plan text", result.SuggestedPlan);
        Assert.StartsWith("You moved Nf3.", result.Explanation, StringComparison.Ordinal);
        Assert.Equal(11, result.PromptTokens);
        Assert.Equal(22, result.CompletionTokens);
        Assert.Equal(33, result.TotalTokens);
    }

    [Fact]
    public async Task GenerateAsync_ThrowsAfterConfiguredAttempts_WhenTransientErrorsPersist()
    {
        var handler = new SequenceHttpMessageHandler(
            new HttpResponseMessage(HttpStatusCode.ServiceUnavailable),
            new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        var httpClient = new HttpClient(handler);
        var options = Options.Create(CreateBackendOptions(maxAttempts: 2));
        var generator = new AzureOpenAiCoachMoveGenerator(
            httpClient,
            options,
            TimeProvider.System,
            NullLogger<AzureOpenAiCoachMoveGenerator>.Instance);

        var request = new CoachMoveGenerationRequest(
            "op-2",
            "game-2",
            "Deep",
            24,
            "Blunder",
            false,
            "Qh5",
            "Queen",
            "d1",
            "h5");

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            generator.GenerateAsync(request, CancellationToken.None));

        Assert.Equal(2, handler.CallCount);
    }

    private static BackendOptions CreateBackendOptions(int maxAttempts)
    {
        return new BackendOptions
        {
            AzureOpenAi = new AzureOpenAiOptions
            {
                Endpoint = "https://example.openai.azure.com",
                DeploymentName = "gpt-4o",
                ApiVersion = "2024-10-21",
                ApiKey = "test-key",
                Retry = new AzureOpenAiRetryOptions
                {
                    MaxAttempts = maxAttempts,
                    BaseDelayMilliseconds = 1,
                    MaxDelayMilliseconds = 2
                }
            }
        };
    }

    private static HttpResponseMessage CreateSuccessResponse()
    {
        var payload = """
        {
          "model": "gpt-4o",
          "choices": [
            {
              "message": {
                "content": "{\"whyWrong\":\"Why text\",\"exploitPath\":\"Exploit text\",\"suggestedPlan\":\"Plan text\"}"
              }
            }
          ],
          "usage": {
            "prompt_tokens": 11,
            "completion_tokens": 22,
            "total_tokens": 33
          }
        }
        """;

        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };
    }

    private sealed class SequenceHttpMessageHandler : HttpMessageHandler
    {
        private readonly Queue<HttpResponseMessage> _responses;

        public SequenceHttpMessageHandler(params HttpResponseMessage[] responses)
        {
            _responses = new Queue<HttpResponseMessage>(responses);
        }

        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            if (_responses.Count == 0)
            {
                throw new InvalidOperationException("No response configured for this request.");
            }

            return Task.FromResult(_responses.Dequeue());
        }
    }
}
