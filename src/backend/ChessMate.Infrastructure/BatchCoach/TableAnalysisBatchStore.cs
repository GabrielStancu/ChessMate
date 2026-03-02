using Azure.Data.Tables;
using Microsoft.Extensions.Logging;

namespace ChessMate.Infrastructure.BatchCoach;

public sealed class TableAnalysisBatchStore : IAnalysisBatchStore
{
    private readonly TableClient _tableClient;
    private readonly ILogger<TableAnalysisBatchStore> _logger;

    private const string GamePartitionPrefix = "game%23";
    private const string AnalysisRowPrefix = "analysis%23";

    public TableAnalysisBatchStore(TableClient tableClient, ILogger<TableAnalysisBatchStore> logger)
    {
        _tableClient = tableClient;
        _logger = logger;
    }

    public async Task UpsertAsync(AnalysisBatchArtifact artifact, CancellationToken cancellationToken)
    {
        await _tableClient.CreateIfNotExistsAsync(cancellationToken);

        var entity = new AnalysisBatchEntity
        {
            PartitionKey = BuildPartitionKey(artifact.GameId),
            RowKey = BuildRowKey(artifact.AnalysisVersion, artifact.CreatedAtUtc),
            GameId = artifact.GameId,
            OperationId = artifact.OperationId,
            AnalysisVersion = artifact.AnalysisVersion,
            CreatedAtUtc = artifact.CreatedAtUtc,
            ExpiresAtUtc = artifact.ExpiresAtUtc,
            SchemaVersion = artifact.SchemaVersion,
            AnalysisMode = artifact.AnalysisMode,
            EngineDepth = artifact.EngineDepth,
            EngineThreads = artifact.EngineThreads,
            EngineTimePerMoveMs = artifact.EngineTimePerMoveMs,
            CoachingCount = artifact.CoachingCount,
            InlinePayloadJson = artifact.InlinePayloadJson,
            FullAnalysisPayloadJson = artifact.FullAnalysisPayloadJson
        };

        await _tableClient.UpsertEntityAsync(entity, TableUpdateMode.Replace, cancellationToken);

        _logger.LogInformation(
            "Analysis batch upserted. gameId {GameId}, operationId {OperationId}, coachingCount {CoachingCount}.",
            artifact.GameId,
            artifact.OperationId,
            artifact.CoachingCount);
    }

    public async Task<IReadOnlyList<AnalysisBatchCacheEntry>> GetForGameAsync(string gameId, CancellationToken cancellationToken)
    {
        await _tableClient.CreateIfNotExistsAsync(cancellationToken);

        var partitionKey = BuildPartitionKey(gameId);
        var results = new List<AnalysisBatchEntity>();

        await foreach (var entity in _tableClient.QueryAsync<AnalysisBatchEntity>(
            x => x.PartitionKey == partitionKey,
            cancellationToken: cancellationToken))
        {
            results.Add(entity);
        }

        return results
            .OrderByDescending(static x => x.CreatedAtUtc)
            .Select(static latest => new AnalysisBatchCacheEntry(
                latest.GameId,
                latest.OperationId,
                latest.AnalysisVersion,
                latest.CreatedAtUtc,
                latest.ExpiresAtUtc,
                latest.SchemaVersion,
                latest.AnalysisMode,
                latest.EngineDepth,
                latest.EngineThreads,
                latest.EngineTimePerMoveMs,
                latest.CoachingCount,
                latest.InlinePayloadJson,
                latest.FullAnalysisPayloadJson))
            .ToArray();
    }

    public static string BuildPartitionKey(string gameId)
    {
        return $"{GamePartitionPrefix}{Escape(gameId)}";
    }

    public static string BuildRowKey(string analysisVersion, DateTimeOffset createdAtUtc)
    {
        return $"{AnalysisRowPrefix}{Escape(analysisVersion)}%23{createdAtUtc.UtcTicks:D19}";
    }

    private static string Escape(string value)
    {
        return Uri.EscapeDataString(value);
    }
}