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
    string? To = null,
    string? FenBefore = null,
    string? FenAfter = null,
    int? CentipawnBefore = null,
    int? CentipawnAfter = null,
    int? CentipawnLoss = null,
    string? BestMove = null,
    string? OpponentBestResponse = null);

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
    IReadOnlyList<string> EligibleClassifications,
    IReadOnlyList<BatchCoachWarningEnvelope>? Warnings = null,
    string? FailureCode = null);

public sealed record BatchCoachWarningEnvelope(
    int Ply,
    string Classification,
    string? Move,
    string Code,
    string Message);

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
    string? Move,
    string? Explanation,
    string? WhyWrong = null,
    string? ExploitPath = null,
    string? SuggestedPlan = null,
    int PromptTokens = 0,
    int CompletionTokens = 0,
    int TotalTokens = 0,
    double LatencyMs = 0,
    string? Model = null,
    bool IsSuccessful = true,
    string? FailureCode = null,
    string? FailureMessage = null)
{
    public static CoachMoveActivityResult CreateFailure(
        BatchCoachMoveEnvelope move,
        string? moveText,
        string failureCode,
        string failureMessage)
    {
        return new CoachMoveActivityResult(
            move.Ply,
            move.Classification,
            move.IsUserMove,
            moveText,
            Explanation: null,
            PromptTokens: 0,
            CompletionTokens: 0,
            TotalTokens: 0,
            LatencyMs: 0,
            Model: null,
            IsSuccessful: false,
            FailureCode: failureCode,
            FailureMessage: failureMessage);
    }
}
