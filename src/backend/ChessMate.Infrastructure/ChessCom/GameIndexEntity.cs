using Azure;
using Azure.Data.Tables;

namespace ChessMate.Infrastructure.ChessCom;

public sealed class GameIndexEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty;

    public string RowKey { get; set; } = string.Empty;

    public DateTimeOffset? Timestamp { get; set; }

    public ETag ETag { get; set; }

    public string GameId { get; set; } = string.Empty;

    public DateTimeOffset PlayedAtUtc { get; set; }

    public string Opponent { get; set; } = string.Empty;

    public string Result { get; set; } = string.Empty;

    public string Opening { get; set; } = string.Empty;

    public string TimeControl { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public DateTimeOffset IngestedAtUtc { get; set; }

    public DateTimeOffset ExpiresAtUtc { get; set; }

    public string SchemaVersion { get; set; } = "v1";
}