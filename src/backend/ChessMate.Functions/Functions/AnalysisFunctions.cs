using ChessMate.Application.Validation;
using ChessMate.Functions.BatchCoach;
using ChessMate.Functions.Contracts;
using ChessMate.Functions.Http;
using ChessMate.Functions.Security;
using ChessMate.Functions.Validation;
using ChessMate.Infrastructure.BatchCoach;
using ChessMate.Infrastructure.Configuration;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.DurableTask;
using Microsoft.DurableTask.Client;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ChessMate.Functions.Functions;

public sealed class AnalysisFunctions
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpResponseFactory _responseFactory;
    private readonly BatchCoachIdempotencyService _idempotencyService;
    private readonly IAnalysisBatchStore _analysisBatchStore;
    private readonly TimeProvider _timeProvider;
    private readonly CorsPolicy _corsPolicy;
    private readonly ILogger<AnalysisFunctions> _logger;

    public AnalysisFunctions(
        HttpResponseFactory responseFactory,
        BatchCoachIdempotencyService idempotencyService,
        IAnalysisBatchStore analysisBatchStore,
        TimeProvider timeProvider,
        CorsPolicy corsPolicy,
        ILogger<AnalysisFunctions> logger)
    {
        _responseFactory = responseFactory;
        _idempotencyService = idempotencyService;
        _analysisBatchStore = analysisBatchStore;
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
            batchCoachRequest);

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

        var artifact = new AnalysisBatchArtifact(
            responseEnvelope.Summary.GameId,
            responseEnvelope.OperationId,
            PersistencePolicy.SchemaVersion,
            createdAtUtc,
            PersistencePolicy.CalculateExpiresAtUtc(createdAtUtc),
            PersistencePolicy.SchemaVersion,
            responseEnvelope.Summary.AnalysisMode,
            responseEnvelope.Coaching.Count,
            payloadJson);

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

        return await _responseFactory.CreateOkAsync(request, responseEnvelope);
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
}
