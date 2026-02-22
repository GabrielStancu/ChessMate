namespace ChessMate.Functions.Contracts;

public sealed record BatchCoachRequestEnvelope(
    string GameId,
    IReadOnlyList<BatchCoachMoveEnvelope> Moves,
    string? AnalysisMode = null,
    IReadOnlyDictionary<string, string>? Metadata = null);

public sealed record BatchCoachMoveEnvelope(
    int Ply,
    string Classification,
    bool IsUserMove,
    string? Move = null,
    string? Piece = null,
    string? From = null,
    string? To = null);

public sealed record BatchCoachResponseEnvelope(
    string SchemaVersion,
    string OperationId,
    BatchCoachSummaryEnvelope Summary,
    IReadOnlyList<BatchCoachCoachingItemEnvelope> Coaching,
    BatchCoachMetadataEnvelope Metadata);

public sealed record BatchCoachSummaryEnvelope(
    string GameId,
    int TotalMoves,
    int EligibleMoves,
    string AnalysisMode);

public sealed record BatchCoachCoachingItemEnvelope(
    int Ply,
    string Classification,
    bool IsUserMove,
    string Move,
    string Explanation);

public sealed record BatchCoachMetadataEnvelope(
    DateTimeOffset CompletedAtUtc,
    IReadOnlyList<string> EligibleClassifications);

public sealed record BatchCoachOrchestrationInput(
    string OperationId,
    BatchCoachRequestEnvelope Request);

public sealed record CoachMoveActivityInput(
    string OperationId,
    string GameId,
    string? AnalysisMode,
    BatchCoachMoveEnvelope Move);

public sealed record CoachMoveActivityResult(
    int Ply,
    string Classification,
    bool IsUserMove,
    string Move,
    string Explanation,
    string? WhyWrong = null,
    string? ExploitPath = null,
    string? SuggestedPlan = null,
    int PromptTokens = 0,
    int CompletionTokens = 0,
    int TotalTokens = 0,
    double LatencyMs = 0,
    string? Model = null);
