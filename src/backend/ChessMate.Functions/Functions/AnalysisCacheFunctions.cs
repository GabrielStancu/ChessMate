using ChessMate.Application.Abstractions;
using ChessMate.Application.Validation;
using ChessMate.Functions.Http;
using ChessMate.Functions.Security;
using ChessMate.Functions.Validation;
using ChessMate.Infrastructure.BatchAnalysis;
using Microsoft.ApplicationInsights;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ChessMate.Functions.Functions;

public sealed class AnalysisCacheFunctions
{
    private readonly HttpResponseFactory _responseFactory;
    private readonly ICorrelationContextAccessor _correlationAccessor;
    private readonly IAnalysisBatchStore _analysisBatchStore;
    private readonly TelemetryClient _telemetryClient;
    private readonly CorsPolicy _corsPolicy;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<AnalysisCacheFunctions> _logger;

    public AnalysisCacheFunctions(
        HttpResponseFactory responseFactory,
        ICorrelationContextAccessor correlationAccessor,
        IAnalysisBatchStore analysisBatchStore,
        TelemetryClient telemetryClient,
        CorsPolicy corsPolicy,
        TimeProvider timeProvider,
        ILogger<AnalysisCacheFunctions> logger)
    {
        _responseFactory = responseFactory;
        _correlationAccessor = correlationAccessor;
        _analysisBatchStore = analysisBatchStore;
        _telemetryClient = telemetryClient;
        _corsPolicy = corsPolicy;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    [Function("GetAnalysisCache")]
    public async Task<HttpResponseData> GetAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "analysis/cache/{gameId}")]
        HttpRequestData request,
        string gameId)
    {
        if (!_corsPolicy.IsOriginAllowed(request))
        {
            return await _responseFactory.CreateForbiddenAsync(request, "CorsForbidden", "Origin is not allowed.");
        }

        var query = System.Web.HttpUtility.ParseQueryString(request.Url.Query);
        string mode;
        int depth;

        try
        {
            mode = query.Get("mode") ?? "standard";
            depth = RequestValidators.ParseOptionalIntegerQuery(query.Get("depth"), "depth", 18);
            Guard.AgainstNullOrWhiteSpace(gameId, nameof(gameId));
        }
        catch (RequestValidationException exception)
        {
            return await _responseFactory.CreateValidationErrorAsync(request, exception);
        }

        var payload = await _analysisBatchStore.GetAsync(
            gameId, mode, depth,
            request.FunctionContext.CancellationToken);

        if (payload is null)
        {
            _telemetryClient.TrackEvent("api.analysiscache.miss",
                new Dictionary<string, string>
                {
                    ["gameId"] = gameId,
                    ["mode"] = mode,
                    ["depth"] = depth.ToString(),
                    ["correlationId"] = _correlationAccessor.CorrelationId
                });

            return await _responseFactory.CreateNotFoundAsync(request);
        }

        _telemetryClient.TrackEvent("api.analysiscache.hit",
            new Dictionary<string, string>
            {
                ["gameId"] = gameId,
                ["mode"] = mode,
                ["depth"] = depth.ToString(),
                ["correlationId"] = _correlationAccessor.CorrelationId
            });

        return await _responseFactory.CreateOkAsync(request,
            JsonSerializer.Deserialize<JsonElement>(payload));
    }

    [Function("PutAnalysisCache")]
    public async Task<HttpResponseData> PutAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "analysis/cache/{gameId}")]
        HttpRequestData request,
        string gameId)
    {
        if (!_corsPolicy.IsOriginAllowed(request))
        {
            return await _responseFactory.CreateForbiddenAsync(request, "CorsForbidden", "Origin is not allowed.");
        }

        var query = System.Web.HttpUtility.ParseQueryString(request.Url.Query);
        string mode;
        int depth;

        try
        {
            mode = query.Get("mode") ?? "standard";
            depth = RequestValidators.ParseOptionalIntegerQuery(query.Get("depth"), "depth", 18);
            Guard.AgainstNullOrWhiteSpace(gameId, nameof(gameId));
        }
        catch (RequestValidationException exception)
        {
            return await _responseFactory.CreateValidationErrorAsync(request, exception);
        }

        string body;
        using (var reader = new StreamReader(request.Body))
        {
            body = await reader.ReadToEndAsync();
        }

        if (string.IsNullOrWhiteSpace(body))
        {
            return await _responseFactory.CreateValidationErrorAsync(request,
                new RequestValidationException("Request body is required.",
                    new Dictionary<string, string[]> { ["body"] = new[] { "Request body is required." } }));
        }

        // Validate that the body is valid JSON
        try
        {
            JsonDocument.Parse(body).Dispose();
        }
        catch (JsonException)
        {
            return await _responseFactory.CreateValidationErrorAsync(request,
                new RequestValidationException("Request body must be valid JSON.",
                    new Dictionary<string, string[]> { ["body"] = new[] { "Request body must be valid JSON." } }));
        }

        var now = _timeProvider.GetUtcNow();

        await _analysisBatchStore.UpsertAsync(
            gameId, mode, depth, body, now,
            request.FunctionContext.CancellationToken);

        _telemetryClient.TrackEvent("api.analysiscache.stored",
            new Dictionary<string, string>
            {
                ["gameId"] = gameId,
                ["mode"] = mode,
                ["depth"] = depth.ToString(),
                ["correlationId"] = _correlationAccessor.CorrelationId
            });

        _logger.LogInformation(
            "Stored analysis cache for game {GameId}, mode {Mode}, depth {Depth}, correlationId {CorrelationId}.",
            gameId, mode, depth, _correlationAccessor.CorrelationId);

        return await _responseFactory.CreateNoContentAsync(request);
    }

    [Function("AnalysisCachePreflight")]
    public async Task<HttpResponseData> PreflightAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "options", Route = "analysis/cache/{gameId}")]
        HttpRequestData request,
        string gameId)
    {
        return await _responseFactory.CreatePreflightAsync(request);
    }
}
