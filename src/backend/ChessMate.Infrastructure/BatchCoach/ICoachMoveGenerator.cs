namespace ChessMate.Infrastructure.BatchCoach;

public interface ICoachMoveGenerator
{
    Task<CoachGenerationResult> GenerateAsync(CoachMoveGenerationRequest request, CancellationToken cancellationToken);
}

public sealed record CoachMoveGenerationRequest(
    string OperationId,
    string GameId,
    string? AnalysisMode,
    int Ply,
    string Classification,
    bool IsUserMove,
    string? Move,
    string? Piece,
    string? From,
    string? To);

public sealed record CoachGenerationResult(
    string WhyWrong,
    string ExploitPath,
    string SuggestedPlan,
    string Explanation,
    int PromptTokens,
    int CompletionTokens,
    int TotalTokens,
    double LatencyMs,
    string Model);
