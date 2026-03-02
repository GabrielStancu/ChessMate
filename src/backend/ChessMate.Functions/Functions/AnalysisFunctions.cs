using ChessMate.Application.Abstractions;
using ChessMate.Application.Validation;
using ChessMate.Functions.BatchCoach;
using ChessMate.Functions.Contracts;
using ChessMate.Functions.Http;
using ChessMate.Functions.Security;
using ChessMate.Functions.Validation;
using ChessMate.Infrastructure.BatchCoach;
using ChessMate.Infrastructure.Configuration;
using Microsoft.ApplicationInsights;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.DurableTask;
using Microsoft.DurableTask.Client;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text.Json;

namespace ChessMate.Functions.Functions;

public sealed class AnalysisFunctions
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpResponseFactory _responseFactory;
    private readonly BatchCoachIdempotencyService _idempotencyService;
    private readonly IAnalysisBatchStore _analysisBatchStore;
    private readonly ICorrelationContextAccessor _correlationAccessor;
    private readonly TelemetryClient _telemetryClient;
    private readonly TimeProvider _timeProvider;
    private readonly CorsPolicy _corsPolicy;
    private readonly ILogger<AnalysisFunctions> _logger;

    private const string CacheHit = "hit";
    private const string CacheMiss = "miss";

    public AnalysisFunctions(
        HttpResponseFactory responseFactory,
        BatchCoachIdempotencyService idempotencyService,
        IAnalysisBatchStore analysisBatchStore,
        ICorrelationContextAccessor correlationAccessor,
        TelemetryClient telemetryClient,
        TimeProvider timeProvider,
        CorsPolicy corsPolicy,
        ILogger<AnalysisFunctions> logger)
    {
        _responseFactory = responseFactory;
        _idempotencyService = idempotencyService;
        _analysisBatchStore = analysisBatchStore;
        _correlationAccessor = correlationAccessor;
        _telemetryClient = telemetryClient;
        _timeProvider = timeProvider;
        _corsPolicy = corsPolicy;
        _logger = logger;
    }

    [Function("BatchCoachPreflight")]
    public async Task<HttpResponseData> BatchCoachPreflightAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "options", Route = "analysis/batch-coach")]
        HttpRequestData request)
    {
        return await _responseFactory.CreatePreflightAsync(request);
    }

    [Function("BatchCoach")]
    public async Task<HttpResponseData> BatchCoachAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "analysis/batch-coach")]
        HttpRequestData request,
        [DurableClient] DurableTaskClient durableTaskClient,
        FunctionContext functionContext)
    {
        if (!_corsPolicy.IsOriginAllowed(request))
        {
            _logger.LogWarning("POST batch-coach blocked by CORS allowlist.");
            return await _responseFactory.CreateForbiddenAsync(
                request,
                "CorsForbidden",
                "Origin is not allowed.");
        }

        var idempotencyKey = ExtractIdempotencyKey(request);
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            _logger.LogWarning("POST batch-coach missing idempotency key.");
            return await _responseFactory.CreateValidationErrorAsync(
                request,
                new RequestValidationException(
                    "Validation failed.",
                    new Dictionary<string, string[]>
                    {
                        ["idempotencyKey"] = new[] { "Idempotency-Key header is required." }
                    }));
        }

        var redactedIdempotencyKey = LogRedactor.RedactIdempotencyKey(idempotencyKey);

        string payload;
        try
        {
            payload = await ReadBodyWithSizeLimitAsync(request.Body, functionContext.CancellationToken);
        }
        catch (RequestValidationException exception)
        {
            _logger.LogWarning(exception, "POST batch-coach request body limit validation failed.");
            return await _responseFactory.CreateValidationErrorAsync(request, exception);
        }

        try
        {
            RequestValidators.ValidateBatchCoachRequest(payload);
        }
        catch (RequestValidationException exception)
        {
            _logger.LogWarning(exception, "POST batch-coach request validation failed.");
            return await _responseFactory.CreateValidationErrorAsync(request, exception);
        }

        BatchCoachRequestEnvelope batchCoachRequest;
        try
        {
            batchCoachRequest = DeserializeBatchCoachRequest(payload);
            RequestValidators.ValidateBatchCoachEnvelope(batchCoachRequest);
        }
        catch (RequestValidationException exception)
        {
            _logger.LogWarning(exception, "POST batch-coach payload deserialization failed.");
            return await _responseFactory.CreateValidationErrorAsync(request, exception);
        }

        var idempotencyDecision = await _idempotencyService.BeginAsync(
            idempotencyKey,
            payload,
            functionContext.CancellationToken);

        _logger.LogInformation(
            "POST batch-coach idempotency check completed. operationId {OperationId}, decision {Decision}.",
            idempotencyDecision.OperationId,
            idempotencyDecision.Kind);

        if (idempotencyDecision.Kind == IdempotencyDecisionKind.Replay)
        {
            _logger.LogInformation(
                "POST batch-coach replaying existing completed response. operationId {OperationId}, idempotencyKey {RedactedIdempotencyKey}.",
                idempotencyDecision.OperationId,
                redactedIdempotencyKey);
            return await _responseFactory.CreateOkAsync(request, idempotencyDecision.ReplayResponse!);
        }

        if (idempotencyDecision.Kind == IdempotencyDecisionKind.Conflict)
        {
            _logger.LogWarning(
                "POST batch-coach duplicate request detected. operationId {OperationId}, existingStatus {ExistingStatus}.",
                idempotencyDecision.OperationId,
                idempotencyDecision.ExistingStatus);
            return await _responseFactory.CreateConflictAsync(
                request,
                "DuplicateInFlight",
                "A request with the same Idempotency-Key is already in flight. Please retry after the original operation completes.");
        }

        var orchestrationInput = new BatchCoachOrchestrationInput(
            idempotencyDecision.OperationId,
            batchCoachRequest,
            _correlationAccessor.CorrelationId);

        var instanceId = await durableTaskClient.ScheduleNewOrchestrationInstanceAsync(
            nameof(BatchCoachDurableFunctions.BatchCoachOrchestratorAsync),
            orchestrationInput);

        _logger.LogInformation(
            "POST batch-coach orchestration scheduled with operationId {OperationId} and instanceId {InstanceId}.",
            idempotencyDecision.OperationId,
            instanceId);

        var completion = await durableTaskClient.WaitForInstanceCompletionAsync(
            instanceId,
            getInputsAndOutputs: true,
            cancellation: functionContext.CancellationToken);

        if (completion is null || completion.RuntimeStatus != OrchestrationRuntimeStatus.Completed)
        {
            _logger.LogError(
                "POST batch-coach orchestration failed to complete successfully. operationId {OperationId}, instanceId {InstanceId}, runtimeStatus {RuntimeStatus}.",
                idempotencyDecision.OperationId,
                instanceId,
                completion?.RuntimeStatus);

            await _idempotencyService.MarkFailedAsync(
                idempotencyDecision.OperationId,
                BatchCoachFailureCodes.OrchestrationFailed,
                functionContext.CancellationToken);

            return await _responseFactory.CreateUpstreamUnavailableAsync(
                request,
                "Batch coaching orchestration did not complete successfully.");
        }

        var responseEnvelope = completion.ReadOutputAs<BatchCoachResponseEnvelope>();
        if (responseEnvelope is null)
        {
            _logger.LogError(
                "POST batch-coach orchestration completed without output. operationId {OperationId}, instanceId {InstanceId}.",
                idempotencyDecision.OperationId,
                instanceId);

            await _idempotencyService.MarkFailedAsync(
                idempotencyDecision.OperationId,
                BatchCoachFailureCodes.OrchestrationFailed,
                functionContext.CancellationToken);

            return await _responseFactory.CreateUpstreamUnavailableAsync(
                request,
                "Batch coaching orchestration produced no output.");
        }

        var createdAtUtc = _timeProvider.GetUtcNow();
        var payloadJson = JsonSerializer.Serialize(responseEnvelope, SerializerOptions);
        var engineConfig = ResolveEngineConfig(batchCoachRequest);
        var analysisPayloadJson = batchCoachRequest.AnalysisSnapshot is null
            ? string.Empty
            : JsonSerializer.Serialize(batchCoachRequest.AnalysisSnapshot, SerializerOptions);

        var artifact = new AnalysisBatchArtifact(
            responseEnvelope.Summary.GameId,
            responseEnvelope.OperationId,
            PersistencePolicy.SchemaVersion,
            createdAtUtc,
            PersistencePolicy.CalculateExpiresAtUtc(createdAtUtc),
            PersistencePolicy.SchemaVersion,
            responseEnvelope.Summary.AnalysisMode,
            engineConfig.Depth,
            engineConfig.Threads,
            engineConfig.TimePerMoveMs,
            responseEnvelope.Coaching.Count,
            payloadJson,
            analysisPayloadJson);

        await _analysisBatchStore.UpsertAsync(artifact, functionContext.CancellationToken);

        await _idempotencyService.MarkCompletedAsync(
            idempotencyDecision.OperationId,
            responseEnvelope,
            functionContext.CancellationToken);

        _logger.LogInformation(
            "POST batch-coach orchestration completed and persisted. operationId {OperationId}, instanceId {InstanceId}, coachingCount {CoachingCount}.",
            responseEnvelope.OperationId,
            instanceId,
            responseEnvelope.Coaching.Count);

        _telemetryClient.TrackEvent(
            "api.batchcoach.completed",
            new Dictionary<string, string>
            {
                ["operationId"] = responseEnvelope.OperationId,
                ["gameId"] = responseEnvelope.Summary.GameId,
                ["analysisMode"] = responseEnvelope.Summary.AnalysisMode,
                ["totalMoves"] = responseEnvelope.Summary.TotalMoves.ToString(),
                ["eligibleMoves"] = responseEnvelope.Summary.EligibleMoves.ToString(),
                ["coachingCount"] = responseEnvelope.Coaching.Count.ToString(),
                ["warningsCount"] = (responseEnvelope.Metadata.Warnings?.Count ?? 0).ToString(),
                ["failureCode"] = responseEnvelope.Metadata.FailureCode ?? "None",
                ["correlationId"] = _correlationAccessor.CorrelationId ?? string.Empty
            });

        return await _responseFactory.CreateOkAsync(request, responseEnvelope);
    }

    [Function("GetAnalysisCache")]
    public async Task<HttpResponseData> GetAnalysisCacheAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "analysis/cache/{gameId}")]
        HttpRequestData request,
        string gameId,
        FunctionContext functionContext)
    {
        if (!_corsPolicy.IsOriginAllowed(request))
        {
            _logger.LogWarning("GET analysis cache blocked by CORS allowlist.");
            return await _responseFactory.CreateForbiddenAsync(
                request,
                "CorsForbidden",
                "Origin is not allowed.");
        }

        var requestedMode = GetQueryValue(request.Url.Query, "analysisMode");
        var requestedDepth = RequestValidators.ParseOptionalIntegerQuery(GetQueryValue(request.Url.Query, "depth"), "depth", 12);
        var requestedThreads = RequestValidators.ParseOptionalIntegerQuery(GetQueryValue(request.Url.Query, "threads"), "threads", 1);
        var requestedTimePerMoveMs = RequestValidators.ParseOptionalIntegerQuery(GetQueryValue(request.Url.Query, "timePerMoveMs"), "timePerMoveMs", 150);

        var requestedConfig = new BatchCoachEngineConfigEnvelope(
            requestedDepth,
            requestedThreads,
            requestedTimePerMoveMs);

        var cachedEntries = await _analysisBatchStore.GetForGameAsync(gameId, functionContext.CancellationToken);
        if (cachedEntries.Count == 0)
        {
            var missNotFound = new AnalysisCacheResponseEnvelope(
                CacheMiss,
                "not_found",
                gameId,
                requestedMode,
                requestedConfig,
                null,
                null,
                null,
                null,
                null);

            return await _responseFactory.CreateOkAsync(request, missNotFound);
        }

        var latest = cachedEntries[0];

        var matchingEntry = cachedEntries.FirstOrDefault(entry =>
            string.Equals(entry.SchemaVersion, PersistencePolicy.SchemaVersion, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(entry.AnalysisVersion, PersistencePolicy.SchemaVersion, StringComparison.OrdinalIgnoreCase) &&
            (string.IsNullOrWhiteSpace(requestedMode) || string.Equals(entry.AnalysisMode, requestedMode, StringComparison.OrdinalIgnoreCase)) &&
            entry.EngineDepth == requestedConfig.Depth &&
            entry.EngineThreads == requestedConfig.Threads &&
            entry.EngineTimePerMoveMs == requestedConfig.TimePerMoveMs);

        if (matchingEntry is null)
        {
            if (!cachedEntries.Any(entry =>
                    string.Equals(entry.SchemaVersion, PersistencePolicy.SchemaVersion, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(entry.AnalysisVersion, PersistencePolicy.SchemaVersion, StringComparison.OrdinalIgnoreCase)))
            {
                var missSchemaMismatch = new AnalysisCacheResponseEnvelope(
                    CacheMiss,
                    "version_mismatch",
                    gameId,
                    requestedMode,
                    requestedConfig,
                    latest.SchemaVersion,
                    latest.AnalysisVersion,
                    latest.CreatedAtUtc,
                    null,
                    null);

                return await _responseFactory.CreateOkAsync(request, missSchemaMismatch);
            }

            if (!string.IsNullOrWhiteSpace(requestedMode) && !cachedEntries.Any(entry =>
                    string.Equals(entry.AnalysisMode, requestedMode, StringComparison.OrdinalIgnoreCase)))
            {
                var missModeMismatch = new AnalysisCacheResponseEnvelope(
                    CacheMiss,
                    "analysis_mode_mismatch",
                    gameId,
                    requestedMode,
                    requestedConfig,
                    latest.SchemaVersion,
                    latest.AnalysisVersion,
                    latest.CreatedAtUtc,
                    null,
                    null);

                return await _responseFactory.CreateOkAsync(request, missModeMismatch);
            }

            var missConfigMismatch = new AnalysisCacheResponseEnvelope(
                CacheMiss,
                "engine_config_mismatch",
                gameId,
                requestedMode,
                requestedConfig,
                latest.SchemaVersion,
                latest.AnalysisVersion,
                latest.CreatedAtUtc,
                null,
                null);

            return await _responseFactory.CreateOkAsync(request, missConfigMismatch);
        }

        if (string.IsNullOrWhiteSpace(matchingEntry.InlinePayloadJson) || string.IsNullOrWhiteSpace(matchingEntry.FullAnalysisPayloadJson))
        {
            var missIncomplete = new AnalysisCacheResponseEnvelope(
                CacheMiss,
                "incomplete_payload",
                gameId,
                requestedMode,
                requestedConfig,
                matchingEntry.SchemaVersion,
                matchingEntry.AnalysisVersion,
                matchingEntry.CreatedAtUtc,
                null,
                null);

            return await _responseFactory.CreateOkAsync(request, missIncomplete);
        }

        var batchCoach = JsonSerializer.Deserialize<BatchCoachResponseEnvelope>(matchingEntry.InlinePayloadJson, SerializerOptions);
        var analysisSnapshot = JsonSerializer.Deserialize<BatchCoachAnalysisSnapshotEnvelope>(matchingEntry.FullAnalysisPayloadJson, SerializerOptions);

        if (batchCoach is null || analysisSnapshot is null)
        {
            var missInvalid = new AnalysisCacheResponseEnvelope(
                CacheMiss,
                "invalid_payload",
                gameId,
                requestedMode,
                requestedConfig,
                matchingEntry.SchemaVersion,
                matchingEntry.AnalysisVersion,
                matchingEntry.CreatedAtUtc,
                null,
                null);

            return await _responseFactory.CreateOkAsync(request, missInvalid);
        }

        var hitResponse = new AnalysisCacheResponseEnvelope(
            CacheHit,
            "persisted",
            gameId,
            requestedMode,
            requestedConfig,
            matchingEntry.SchemaVersion,
            matchingEntry.AnalysisVersion,
            matchingEntry.CreatedAtUtc,
            batchCoach,
            analysisSnapshot);

        _logger.LogInformation(
            "GET analysis cache hit. gameId {GameId}, analysisMode {AnalysisMode}, depth {Depth}, threads {Threads}, timePerMoveMs {TimePerMoveMs}.",
            gameId,
            requestedMode,
            requestedDepth,
            requestedThreads,
            requestedTimePerMoveMs);

        return await _responseFactory.CreateOkAsync(request, hitResponse);
    }

    private static string? ExtractIdempotencyKey(HttpRequestData request)
    {
        return request.Headers.TryGetValues("Idempotency-Key", out var values)
            ? values.FirstOrDefault()
            : null;
    }

    private static async Task<string> ReadBodyWithSizeLimitAsync(Stream body, CancellationToken cancellationToken)
    {
        await using var copyStream = new MemoryStream();
        var buffer = new byte[8192];
        var totalRead = 0;

        while (true)
        {
            var read = await body.ReadAsync(buffer, cancellationToken);
            if (read == 0)
            {
                break;
            }

            totalRead += read;
            RequestValidators.ValidatePayloadSize(totalRead);
            await copyStream.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }

        return System.Text.Encoding.UTF8.GetString(copyStream.ToArray());
    }

    private static BatchCoachRequestEnvelope DeserializeBatchCoachRequest(string payload)
    {
        BatchCoachRequestEnvelope? request;

        try
        {
            request = JsonSerializer.Deserialize<BatchCoachRequestEnvelope>(payload, SerializerOptions);
        }
        catch (JsonException)
        {
            throw CreateInvalidPayloadException("body must be valid JSON.");
        }

        if (request is null)
        {
            throw CreateInvalidPayloadException("body is required.");
        }

        if (string.IsNullOrWhiteSpace(request.GameId))
        {
            throw CreateInvalidPayloadException("gameId is required.");
        }

        if (request.Moves is null)
        {
            throw CreateInvalidPayloadException("moves is required.");
        }

        return request;
    }

    private static RequestValidationException CreateInvalidPayloadException(string message)
    {
        return new RequestValidationException(
            "Validation failed.",
            new Dictionary<string, string[]>
            {
                ["body"] = [message]
            });
    }

    private static BatchCoachEngineConfigEnvelope ResolveEngineConfig(BatchCoachRequestEnvelope request)
    {
        if (request.AnalysisSnapshot is not null)
        {
            return request.AnalysisSnapshot.EngineConfig;
        }

        var depth = TryReadMetadataInt(request.Metadata, "depth") ?? 12;
        var threads = TryReadMetadataInt(request.Metadata, "threads") ?? 1;
        var timePerMoveMs = TryReadMetadataInt(request.Metadata, "timePerMoveMs") ?? 150;

        return new BatchCoachEngineConfigEnvelope(depth, threads, timePerMoveMs);
    }

    private static int? TryReadMetadataInt(IReadOnlyDictionary<string, string>? metadata, string key)
    {
        if (metadata is null || !metadata.TryGetValue(key, out var rawValue))
        {
            return null;
        }

        return int.TryParse(rawValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? value
            : null;
    }

    private static string? GetQueryValue(string queryString, string key)
    {
        if (string.IsNullOrWhiteSpace(queryString))
        {
            return null;
        }

        var query = queryString[0] == '?' ? queryString[1..] : queryString;
        if (string.IsNullOrWhiteSpace(query))
        {
            return null;
        }

        var segments = query.Split('&', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var segment in segments)
        {
            var separatorIndex = segment.IndexOf('=');
            if (separatorIndex < 0)
            {
                continue;
            }

            var currentKey = Uri.UnescapeDataString(segment[..separatorIndex]);
            if (!string.Equals(currentKey, key, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var rawValue = segment[(separatorIndex + 1)..];
            return Uri.UnescapeDataString(rawValue);
        }

        return null;
    }
}
