using System.Text.RegularExpressions;

namespace ChessMate.Infrastructure.BatchCoach;

/// <summary>
/// Post-generation validation layer that scans LLM coaching output for piece references
/// that contradict the actual board position. Flags anomalies for telemetry without
/// altering the response contract.
/// </summary>
public static class CoachResponseValidator
{
    private static readonly Regex PieceMentionRegex = new(
        @"\b(king|queen|rook|bishop|knight|pawn)\s+on\s+([a-h][1-8])\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static CoachValidationResult Validate(
        string whyWrong,
        string exploitPath,
        string suggestedPlan,
        BoardSnapshot? board)
    {
        if (board is null)
            return CoachValidationResult.Valid;

        var combined = $"{whyWrong} {exploitPath} {suggestedPlan}";
        var anomalies = new List<string>();

        foreach (Match match in PieceMentionRegex.Matches(combined))
        {
            var mentionedType = match.Groups[1].Value;
            var mentionedSquare = match.Groups[2].Value.ToLowerInvariant();
            var squareIndex = BoardSnapshot.ParseSquare(mentionedSquare);

            if (squareIndex is null) continue;

            var actualPiece = board.PieceAt(squareIndex.Value);
            if (actualPiece is null || !actualPiece.TypeName.Equals(mentionedType, StringComparison.OrdinalIgnoreCase))
                anomalies.Add($"'{match.Value}' (no {mentionedType.ToLower()} found on {mentionedSquare})");
        }

        return anomalies.Count > 0
            ? new CoachValidationResult(false, anomalies)
            : CoachValidationResult.Valid;
    }
}

public sealed record CoachValidationResult(bool IsValid, IReadOnlyList<string> Anomalies)
{
    public static readonly CoachValidationResult Valid = new(true, Array.Empty<string>());
}
