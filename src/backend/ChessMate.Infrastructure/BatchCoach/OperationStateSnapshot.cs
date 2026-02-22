namespace ChessMate.Infrastructure.BatchCoach;

public sealed record OperationStateSnapshot(
    string OperationId,
    string IdempotencyKey,
    string RequestHash,
    string Status,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    string? ResponsePayloadJson,
    string? ErrorCode);