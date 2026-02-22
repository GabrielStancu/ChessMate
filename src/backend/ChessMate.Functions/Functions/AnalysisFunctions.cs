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
    private readonly ILogger<AnalysisFunctions> _logger;

    public AnalysisFunctions(HttpResponseFactory responseFactory, ILogger<AnalysisFunctions> logger)
    {
        _responseFactory = responseFactory;
        _logger = logger;
    }

    [Function("BatchCoach")]
    public async Task<HttpResponseData> BatchCoachAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "analysis/batch-coach")]
        HttpRequestData request,
        [DurableClient] DurableTaskClient durableTaskClient,
        FunctionContext functionContext)
    {
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

        var operationId = Guid.NewGuid().ToString("N");
        var orchestrationInput = new BatchCoachOrchestrationInput(operationId, batchCoachRequest);

        var instanceId = await durableTaskClient.ScheduleNewOrchestrationInstanceAsync(
            nameof(BatchCoachDurableFunctions.BatchCoachOrchestratorAsync),
            orchestrationInput);

        _logger.LogInformation(
            "POST batch-coach orchestration scheduled with operationId {OperationId} and instanceId {InstanceId}.",
            operationId,
            instanceId);

        var completion = await durableTaskClient.WaitForInstanceCompletionAsync(
            instanceId,
            getInputsAndOutputs: true,
            cancellation: functionContext.CancellationToken);

        if (completion is null || completion.RuntimeStatus != OrchestrationRuntimeStatus.Completed)
        {
            _logger.LogError(
                "POST batch-coach orchestration failed to complete successfully. operationId {OperationId}, instanceId {InstanceId}, runtimeStatus {RuntimeStatus}.",
                operationId,
                instanceId,
                completion?.RuntimeStatus);

            return await _responseFactory.CreateUpstreamUnavailableAsync(
                request,
                "Batch coaching orchestration did not complete successfully.");
        }

        var responseEnvelope = completion.ReadOutputAs<BatchCoachResponseEnvelope>();
        if (responseEnvelope is null)
        {
            _logger.LogError(
                "POST batch-coach orchestration completed without output. operationId {OperationId}, instanceId {InstanceId}.",
                operationId,
                instanceId);

            return await _responseFactory.CreateUpstreamUnavailableAsync(
                request,
                "Batch coaching orchestration produced no output.");
        }

        _logger.LogInformation(
            "POST batch-coach orchestration completed. operationId {OperationId}, instanceId {InstanceId}, coachingCount {CoachingCount}.",
            responseEnvelope.OperationId,
            instanceId,
            responseEnvelope.Coaching.Count);

        return await _responseFactory.CreateOkAsync(request, responseEnvelope);
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
