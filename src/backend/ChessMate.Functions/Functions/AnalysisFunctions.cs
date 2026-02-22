using ChessMate.Application.Validation;
using ChessMate.Functions.BatchCoach;
using ChessMate.Functions.Contracts;
using ChessMate.Functions.Http;
using ChessMate.Functions.Validation;
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
    private readonly ILogger<AnalysisFunctions> _logger;

    public AnalysisFunctions(
        HttpResponseFactory responseFactory,
        BatchCoachIdempotencyService idempotencyService,
        ILogger<AnalysisFunctions> logger)
    {
        _responseFactory = responseFactory;
        _idempotencyService = idempotencyService;
        _logger = logger;
    }

    [Function("BatchCoach")]
    public async Task<HttpResponseData> BatchCoachAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "analysis/batch-coach")]
        HttpRequestData request,
        [DurableClient] DurableTaskClient durableTaskClient,
        FunctionContext functionContext)
    {
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

        var payload = await new StreamReader(request.Body).ReadToEndAsync();

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
                "POST batch-coach replaying existing completed response. operationId {OperationId}.",
                idempotencyDecision.OperationId);
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
                "OrchestrationFailed",
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
                "NoOutput",
                functionContext.CancellationToken);

            return await _responseFactory.CreateUpstreamUnavailableAsync(
                request,
                "Batch coaching orchestration produced no output.");
        }

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
