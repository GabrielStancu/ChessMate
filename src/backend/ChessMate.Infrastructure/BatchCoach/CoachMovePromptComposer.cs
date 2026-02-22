using System.Text;

namespace ChessMate.Infrastructure.BatchCoach;

public static class CoachMovePromptComposer
{
    public static string CreateRolePhrase(bool isUserMove)
    {
        return isUserMove ? "You moved" : "Opponent moved";
    }

    public static string CreateMoveText(CoachMoveGenerationRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.Move))
        {
            return request.Move.Trim();
        }

        var piece = string.IsNullOrWhiteSpace(request.Piece) ? "piece" : request.Piece.Trim().ToLowerInvariant();
        var to = string.IsNullOrWhiteSpace(request.To) ? "an unknown square" : request.To.Trim();

        return $"the {piece} to {to}";
    }

    public static string ComposeSystemPrompt()
    {
        return """
You are an elite chess coach.
Return ONLY valid JSON with this exact shape:
{
  "whyWrong": "...",
  "exploitPath": "...",
  "suggestedPlan": "..."
}

Rules:
- Each field is required and non-empty.
- Keep each field concise (1-3 sentences).
- Explain concrete chess ideas, not generic advice.
- Do not include markdown, code fences, or additional keys.
""";
    }

    public static string ComposeUserPrompt(CoachMoveGenerationRequest request, string rolePhrase, string moveText)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Context for one flagged move:");
        builder.AppendLine($"- operationId: {request.OperationId}");
        builder.AppendLine($"- gameId: {request.GameId}");
        builder.AppendLine($"- analysisMode: {request.AnalysisMode ?? "Quick"}");
        builder.AppendLine($"- ply: {request.Ply}");
        builder.AppendLine($"- classification: {request.Classification}");
        builder.AppendLine($"- moveNarrationPrefix: {rolePhrase}");
        builder.AppendLine($"- moveText: {moveText}");
        builder.AppendLine($"- fromSquare: {request.From ?? "unknown"}");
        builder.AppendLine($"- toSquare: {request.To ?? "unknown"}");
        builder.AppendLine();
        builder.AppendLine("Write coaching so it can be presented with the narration prefix and move text above.");

        return builder.ToString();
    }

    public static string ComposeExplanation(string rolePhrase, string moveText, string whyWrong, string exploitPath, string suggestedPlan)
    {
        return $"{rolePhrase} {moveText}. Why this was wrong: {whyWrong} Exploit path: {exploitPath} Suggested plan: {suggestedPlan}";
    }
}
