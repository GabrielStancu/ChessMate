namespace ChessMate.Infrastructure.BatchCoach;

public interface IAnalysisBatchStore
{
    Task UpsertAsync(AnalysisBatchArtifact artifact, CancellationToken cancellationToken);

    Task<IReadOnlyList<AnalysisBatchCacheEntry>> GetForGameAsync(string gameId, CancellationToken cancellationToken);
}

public sealed record AnalysisBatchCacheEntry(
    string GameId,
    string OperationId,
    string AnalysisVersion,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset ExpiresAtUtc,
    string SchemaVersion,
    string AnalysisMode,
    int EngineDepth,
    int EngineThreads,
    int EngineTimePerMoveMs,
    int CoachingCount,
    string InlinePayloadJson,
    string FullAnalysisPayloadJson);