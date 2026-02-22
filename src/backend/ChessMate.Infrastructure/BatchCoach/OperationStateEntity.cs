using Azure;
using Azure.Data.Tables;

namespace ChessMate.Infrastructure.BatchCoach;

public sealed class OperationStateEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty;

    public string RowKey { get; set; } = string.Empty;

    public DateTimeOffset? Timestamp { get; set; }

    public ETag ETag { get; set; }

    public string OperationId { get; set; } = string.Empty;

    public string IdempotencyKey { get; set; } = string.Empty;

    public string RequestHash { get; set; } = string.Empty;

    public string Status { get; set; } = OperationStateStatus.Running;

    public DateTimeOffset StartedAtUtc { get; set; }

    public DateTimeOffset? CompletedAtUtc { get; set; }

    public string ResponsePayloadJson { get; set; } = string.Empty;

    public string ErrorCode { get; set; } = string.Empty;

    public string SchemaVersion { get; set; } = "1.0";
}