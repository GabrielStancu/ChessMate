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
You are a chess coach giving brief, concrete feedback on a bad move.
Return ONLY valid JSON:
{
  "whyWrong": "...",
  "exploitPath": "...",
  "suggestedPlan": "..."
}

Rules:
- Each field: exactly 1 sentence, max 25 words. Be direct.
- You receive a decoded board with every piece and its square. ONLY mention pieces that appear in that list.
- Never invent pieces, squares, or moves not supported by the board data.
- "whyWrong": State the specific tactical or positional problem the move creates (e.g. leaves a piece hanging, blocks development, weakens a square).
- "exploitPath": Use the opponentBestPunishment move to explain what the opponent wins or threatens. This is the key move — center your explanation around it.
- "suggestedPlan": State the better move and why it is better in one phrase.
- Never say "the engine", "Stockfish", "analysis shows", "best move is", or similar meta-commentary. Speak as a coach talking directly to a student.
- No markdown, no code fences, no extra keys.
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

        if (request.CentipawnBefore.HasValue)
        {
            builder.AppendLine($"- evalBeforeMove: {FormatCentipawn(request.CentipawnBefore.Value)}");
        }

        if (request.CentipawnAfter.HasValue)
        {
            builder.AppendLine($"- evalAfterMove: {FormatCentipawn(request.CentipawnAfter.Value)}");
        }

        if (request.CentipawnLoss.HasValue && request.CentipawnLoss.Value > 0)
        {
            builder.AppendLine($"- centipawnLoss: {request.CentipawnLoss.Value} (higher = worse move)");
        }

        if (!string.IsNullOrWhiteSpace(request.BestMove))
        {
            var bestMoveReadable = UciMoveDescriber.Describe(request.BestMove, request.FenBefore);
            builder.AppendLine($"- betterAlternative: {bestMoveReadable}");
        }

        if (!string.IsNullOrWhiteSpace(request.OpponentBestResponse))
        {
            var refutationReadable = UciMoveDescriber.Describe(request.OpponentBestResponse, request.FenAfter);
            builder.AppendLine($"- opponentBestPunishment: {refutationReadable}");
        }

        if (!string.IsNullOrWhiteSpace(request.FenBefore))
        {
            var boardBefore = FenBoardDescriber.Describe(request.FenBefore);
            builder.AppendLine();
            builder.AppendLine("Board BEFORE the move (this is the ground truth — only reference pieces listed here):");
            builder.AppendLine(boardBefore);
        }

        if (!string.IsNullOrWhiteSpace(request.FenAfter))
        {
            var boardAfter = FenBoardDescriber.Describe(request.FenAfter);
            builder.AppendLine();
            builder.AppendLine("Board AFTER the move:");
            builder.AppendLine(boardAfter);
        }

        builder.AppendLine();
        builder.AppendLine("Only reference pieces visible in the board above. Be brief and direct.");

        return builder.ToString();
    }

    public static string ComposeExplanation(string rolePhrase, string moveText, string whyWrong, string exploitPath, string suggestedPlan)
    {
        return $"{rolePhrase} {moveText}. Why this was wrong: {whyWrong} Exploit path: {exploitPath} Suggested plan: {suggestedPlan}";
    }

    private static string FormatCentipawn(int centipawn)
    {
        var sign = centipawn >= 0 ? "+" : "";
        var pawns = centipawn / 100.0;
        return $"{sign}{pawns:F2} (positive = White advantage, negative = Black advantage)";
    }
}
