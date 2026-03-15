using Azure.Data.Tables;
using ChessMate.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;

namespace ChessMate.Infrastructure.BatchAnalysis;

public sealed class TableAnalysisBatchStore : IAnalysisBatchStore
{
    private readonly TableClient _tableClient;
    private readonly ILogger<TableAnalysisBatchStore> _logger;

    public TableAnalysisBatchStore(TableClient tableClient, ILogger<TableAnalysisBatchStore> logger)
    {
        _tableClient = tableClient;
        _logger = logger;
    }

    public async Task<string?> GetAsync(string gameId, string analysisMode, int engineDepth, CancellationToken cancellationToken)
    {
        var partitionKey = BuildPartitionKey(gameId);
        var rowKeyPrefix = BuildRowKeyPrefix(analysisMode, engineDepth);

        await foreach (var entity in _tableClient.QueryAsync<AnalysisBatchEntity>(
                           e => e.PartitionKey == partitionKey && e.RowKey.CompareTo(rowKeyPrefix) >= 0,
                           cancellationToken: cancellationToken))
        {
            if (!entity.RowKey.StartsWith(rowKeyPrefix, StringComparison.Ordinal))
            {
                break;
            }

            _logger.LogInformation(
                "Cache hit for game {GameId}, mode {AnalysisMode}, depth {Depth}.",
                gameId, analysisMode, engineDepth);

            return entity.GetPayload();
        }

        return null;
    }

    public async Task UpsertAsync(
        string gameId,
        string analysisMode,
        int engineDepth,
        string analysisPayloadJson,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        await _tableClient.CreateIfNotExistsAsync(cancellationToken);

        var entity = new AnalysisBatchEntity
        {
            PartitionKey = BuildPartitionKey(gameId),
            RowKey = BuildRowKey(analysisMode, engineDepth, createdAtUtc),
            GameId = gameId,
            AnalysisMode = analysisMode,
            EngineDepth = engineDepth,
            CreatedAtUtc = createdAtUtc,
            ExpiresAtUtc = PersistencePolicy.CalculateExpiresAtUtc(createdAtUtc),
            SchemaVersion = PersistencePolicy.SchemaVersion
        };
        entity.SetPayload(analysisPayloadJson);

        await _tableClient.UpsertEntityAsync(entity, TableUpdateMode.Replace, cancellationToken);

        _logger.LogInformation(
            "Cached analysis for game {GameId}, mode {AnalysisMode}, depth {Depth}.",
            gameId, analysisMode, engineDepth);
    }

    public static string BuildPartitionKey(string gameId)
    {
        return $"game%23{EscapeTableKeyComponent(gameId)}";
    }

    public static string BuildRowKey(string analysisMode, int engineDepth, DateTimeOffset createdAtUtc)
    {
        var reverseTicks = long.MaxValue - createdAtUtc.UtcTicks;
        return $"analysis%23{EscapeTableKeyComponent(analysisMode)}%23d{engineDepth}%23{reverseTicks:D19}";
    }

    public static string BuildRowKeyPrefix(string analysisMode, int engineDepth)
    {
        return $"analysis%23{EscapeTableKeyComponent(analysisMode)}%23d{engineDepth}%23";
    }

    private static string EscapeTableKeyComponent(string value)
    {
        return Uri.EscapeDataString(value);
    }
}
