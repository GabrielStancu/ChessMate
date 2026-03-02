namespace ChessMate.Infrastructure.BatchCoach;

public sealed record AnalysisBatchArtifact(
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