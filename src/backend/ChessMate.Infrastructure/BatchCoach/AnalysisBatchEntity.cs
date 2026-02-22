using Azure;
using Azure.Data.Tables;

namespace ChessMate.Infrastructure.BatchCoach;

public sealed class AnalysisBatchEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty;

    public string RowKey { get; set; } = string.Empty;

    public DateTimeOffset? Timestamp { get; set; }

    public ETag ETag { get; set; }

    public string GameId { get; set; } = string.Empty;

    public string OperationId { get; set; } = string.Empty;

    public string AnalysisVersion { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; }

    public DateTimeOffset ExpiresAtUtc { get; set; }

    public string SchemaVersion { get; set; } = string.Empty;

    public string AnalysisMode { get; set; } = string.Empty;

    public int CoachingCount { get; set; }

    public string InlinePayloadJson { get; set; } = string.Empty;
}