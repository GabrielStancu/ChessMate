namespace ChessMate.Infrastructure.BatchCoach;

public interface IOperationStateStore
{
    Task<OperationStateSnapshot?> GetByRequestIdentityAsync(
        string idempotencyKey,
        string requestHash,
        CancellationToken cancellationToken);

    Task<OperationStateSnapshot?> GetByOperationIdAsync(
        string operationId,
        CancellationToken cancellationToken);

    Task<bool> TryCreateRunningAsync(
        string operationId,
        string idempotencyKey,
        string requestHash,
        DateTimeOffset startedAtUtc,
        CancellationToken cancellationToken);

    Task<bool> TrySetTerminalStatusAsync(
        string operationId,
        string status,
        DateTimeOffset completedAtUtc,
        string? responsePayloadJson,
        string? errorCode,
        CancellationToken cancellationToken);
}