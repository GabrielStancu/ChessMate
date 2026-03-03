using System.Text;

namespace ChessMate.Infrastructure.BatchCoach;

public static class CoachMovePromptComposer
{
    public const string ConciseVerbosity = "concise";
    public const string BalancedVerbosity = "balanced";
    public const string DetailedVerbosity = "detailed";

    public static string CreateRolePhrase(bool isUserMove)
    {
        return isUserMove ? "You moved" : "Opponent moved";
    }

    public static string NormalizePromptVerbosity(string? verbosity)
    {
        if (string.Equals(verbosity, ConciseVerbosity, StringComparison.OrdinalIgnoreCase))
        {
            return ConciseVerbosity;
        }

        if (string.Equals(verbosity, DetailedVerbosity, StringComparison.OrdinalIgnoreCase))
        {
            return DetailedVerbosity;
        }

        return BalancedVerbosity;
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

    public static string ComposeSystemPrompt(string? promptVerbosity, bool strongerGrounding = false)
    {
        var verbosity = NormalizePromptVerbosity(promptVerbosity);
        var lengthRule = verbosity switch
        {
            ConciseVerbosity => "Each field: exactly 1 sentence, max 12 words.",
            DetailedVerbosity => "Each field: 1-2 sentences, max 45 words.",
            _ => "Each field: exactly 1 sentence, max 30 words."
        };

        var motifRule = verbosity == ConciseVerbosity
            ? "- Concise mode: prioritize tactical motifs first (pin, fork, skewer, discovered attack, hanging piece, capture threat). Mention at least one supported motif when available."
            : "- Prioritize concrete, grounded positional and tactical ideas from provided context.";

        var conciseFieldRule = verbosity == ConciseVerbosity
            ? "- Concise mode field rule: both \"whyWrong\" and \"exploitPath\" must each name at least one supported tactical motif."
            : "- Field rule: use motifs when supported, otherwise stay grounded in positional themes.";

        var toneRule = verbosity == ConciseVerbosity
            ? "- Tone: vivid, human, and practical in an attacking-school spirit (Tal-inspired energy), never theatrical or speculative."
            : "- Tone: human, practical, and direct.";

        var groundingEscalation = strongerGrounding
            ? "- Extra grounding mode: avoid definitive tactical labels unless explicitly supported by listed motifs/captures; if uncertain, say 'may', 'can', or 'likely'."
            : string.Empty;

        return $$"""
You are a chess coach giving grounded, practical feedback on a bad move.
Prefer positional guidance (plans, piece activity, king safety, pawn structure, weak squares, and development) over definitive tactical claims.
Return ONLY valid JSON:
{
  "whyWrong": "...",
  "exploitPath": "...",
  "suggestedPlan": "..."
}

Rules:
- {{lengthRule}}
- {{motifRule}}
- {{conciseFieldRule}}
- {{toneRule}}
- You receive a decoded board with every piece and its square. ONLY mention pieces that appear in that list.
- Never invent pieces, squares, or moves not supported by the board data.
- If evidence is insufficient, use uncertainty qualifiers such as: may, can, could, likely.
- "whyWrong": explain the main positional or tactical drawback in grounded language.
- "exploitPath": explain realistic opponent pressure or improvement from opponentBestPunishment without claiming forced lines unless fully supported.
- "suggestedPlan": provide a practical, general plan tied to board facts.
- Never say "the engine", "Stockfish", "analysis shows", or similar meta-commentary.
- A "Legal captures" section is provided. You MUST NOT describe any capture unless it appears exactly in that list.
- {{groundingEscalation}}
- No markdown, no code fences, no extra keys.
""";
    }

    public static string ComposeUserPrompt(CoachMoveGenerationRequest request, string rolePhrase, string moveText, TacticalAnnotation? annotation = null)
    {
        var builder = new StringBuilder();
        var normalizedVerbosity = NormalizePromptVerbosity(request.PromptVerbosity);
        builder.AppendLine("Context for one flagged move:");
        builder.AppendLine($"- operationId: {request.OperationId}");
        builder.AppendLine($"- gameId: {request.GameId}");
        builder.AppendLine($"- analysisMode: {request.AnalysisMode ?? "Quick"}");
        builder.AppendLine($"- promptVerbosity: {normalizedVerbosity}");
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

        if (annotation is { HasContent: true })
        {
            if (annotation.Motifs.Count > 0)
            {
                builder.AppendLine();
                builder.AppendLine("Detected tactical motifs AFTER the move (use these to ground your explanation):");
                foreach (var motif in annotation.Motifs)
                    builder.AppendLine($"- {motif}");
            }

            builder.AppendLine();
            builder.AppendLine("Legal captures available AFTER the move (ONLY these captures are pseudo-legal — do NOT describe any other capture):");
            builder.AppendLine(annotation.LegalCapturesText);
        }

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
