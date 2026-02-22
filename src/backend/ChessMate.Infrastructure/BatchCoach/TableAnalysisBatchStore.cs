using Azure.Data.Tables;

namespace ChessMate.Infrastructure.BatchCoach;

public sealed class TableAnalysisBatchStore : IAnalysisBatchStore
{
    private readonly TableClient _tableClient;

    private const string GamePartitionPrefix = "game%23";
    private const string AnalysisRowPrefix = "analysis%23";

    public TableAnalysisBatchStore(TableClient tableClient)
    {
        _tableClient = tableClient;
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
            CoachingCount = artifact.CoachingCount,
            InlinePayloadJson = artifact.InlinePayloadJson
        };

        await _tableClient.UpsertEntityAsync(entity, TableUpdateMode.Replace, cancellationToken);
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