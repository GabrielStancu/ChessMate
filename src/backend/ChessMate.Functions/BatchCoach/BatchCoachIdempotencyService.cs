using ChessMate.Functions.Contracts;
using ChessMate.Infrastructure.BatchCoach;
using System.Text.Json;

namespace ChessMate.Functions.BatchCoach;

public sealed class BatchCoachIdempotencyService
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly IOperationStateStore _operationStateStore;
    private readonly IRequestHashProvider _requestHashProvider;
    private readonly TimeProvider _timeProvider;

    public BatchCoachIdempotencyService(
        IOperationStateStore operationStateStore,
        IRequestHashProvider requestHashProvider,
        TimeProvider timeProvider)
    {
        _operationStateStore = operationStateStore;
        _requestHashProvider = requestHashProvider;
        _timeProvider = timeProvider;
    }

    public async Task<IdempotencyDecision> BeginAsync(string idempotencyKey, string payload, CancellationToken cancellationToken)
    {
        var requestHash = _requestHashProvider.ComputePayloadHash(payload);
        var operationId = _requestHashProvider.ComputeOperationId(idempotencyKey, requestHash);

        var existing = await _operationStateStore.GetByRequestIdentityAsync(idempotencyKey, requestHash, cancellationToken);
        if (existing is not null)
        {
            return ResolveExistingDecision(existing, operationId);
        }

        var created = await _operationStateStore.TryCreateRunningAsync(
            operationId,
            idempotencyKey,
            requestHash,
            _timeProvider.GetUtcNow(),
            cancellationToken);

        if (created)
        {
            return IdempotencyDecision.StartNew(operationId);
        }

        var postConflictExisting = await _operationStateStore.GetByRequestIdentityAsync(idempotencyKey, requestHash, cancellationToken)
            ?? await _operationStateStore.GetByOperationIdAsync(operationId, cancellationToken);

        return postConflictExisting is null
            ? IdempotencyDecision.Conflict(operationId, OperationStateStatus.Running)
            : ResolveExistingDecision(postConflictExisting, operationId);
    }

    public async Task MarkCompletedAsync(
        string operationId,
        BatchCoachResponseEnvelope responseEnvelope,
        CancellationToken cancellationToken)
    {
        var status = string.Equals(
            responseEnvelope.Metadata.FailureCode,
            BatchCoachFailureCodes.PartialCoaching,
            StringComparison.Ordinal)
            ? OperationStateStatus.PartialCoaching
            : OperationStateStatus.Completed;

        var responseJson = JsonSerializer.Serialize(responseEnvelope, SerializerOptions);
        await _operationStateStore.TrySetTerminalStatusAsync(
            operationId,
            status,
            _timeProvider.GetUtcNow(),
            responseJson,
            errorCode: null,
            cancellationToken);
    }

    public async Task MarkFailedAsync(string operationId, string errorCode, CancellationToken cancellationToken)
    {
        await _operationStateStore.TrySetTerminalStatusAsync(
            operationId,
            OperationStateStatus.Failed,
            _timeProvider.GetUtcNow(),
            responsePayloadJson: null,
            errorCode,
            cancellationToken);
    }

    private static IdempotencyDecision ResolveExistingDecision(OperationStateSnapshot existing, string fallbackOperationId)
    {
        var resolvedOperationId = string.IsNullOrWhiteSpace(existing.OperationId)
            ? fallbackOperationId
            : existing.OperationId;

        var canReplay = string.Equals(existing.Status, OperationStateStatus.Completed, StringComparison.Ordinal) ||
                        string.Equals(existing.Status, OperationStateStatus.PartialCoaching, StringComparison.Ordinal);

        if (canReplay &&
            !string.IsNullOrWhiteSpace(existing.ResponsePayloadJson))
        {
            var response = JsonSerializer.Deserialize<BatchCoachResponseEnvelope>(existing.ResponsePayloadJson, SerializerOptions);
            if (response is not null)
            {
                return IdempotencyDecision.Replay(resolvedOperationId, response);
            }
        }

        return IdempotencyDecision.Conflict(resolvedOperationId, existing.Status);
    }
}

public sealed record IdempotencyDecision(
    string OperationId,
    IdempotencyDecisionKind Kind,
    BatchCoachResponseEnvelope? ReplayResponse,
    string? ExistingStatus)
{
    public static IdempotencyDecision StartNew(string operationId)
        => new(operationId, IdempotencyDecisionKind.StartNew, null, null);

    public static IdempotencyDecision Replay(string operationId, BatchCoachResponseEnvelope replayResponse)
        => new(operationId, IdempotencyDecisionKind.Replay, replayResponse, OperationStateStatus.Completed);

    public static IdempotencyDecision Conflict(string operationId, string? existingStatus)
        => new(operationId, IdempotencyDecisionKind.Conflict, null, existingStatus);
}

public enum IdempotencyDecisionKind
{
    StartNew,
    Replay,
    Conflict
}