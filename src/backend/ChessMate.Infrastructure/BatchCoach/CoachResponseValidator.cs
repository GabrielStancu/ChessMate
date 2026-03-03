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

    private static readonly Regex AbsoluteClaimRegex = new(
        @"\b(always|never|guaranteed|definitely|certainly|forced\s+win|completely\s+winning|cannot\s+be\s+stopped)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex PinClaimRegex = new(
        @"\b(pin|pinned|pinning)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static CoachValidationResult Validate(
        string whyWrong,
        string exploitPath,
        string suggestedPlan,
        BoardSnapshot? board,
        TacticalAnnotation? annotation = null)
    {
        var combined = $"{whyWrong} {exploitPath} {suggestedPlan}";
        var contradictions = new List<string>();
        var absoluteClaimIndicators = new List<string>();

        if (board is not null)
        {
            foreach (Match match in PieceMentionRegex.Matches(combined))
            {
                var mentionedType = match.Groups[1].Value;
                var mentionedSquare = match.Groups[2].Value.ToLowerInvariant();
                var squareIndex = BoardSnapshot.ParseSquare(mentionedSquare);

                if (squareIndex is null) continue;

                var actualPiece = board.PieceAt(squareIndex.Value);
                if (actualPiece is null || !actualPiece.TypeName.Equals(mentionedType, StringComparison.OrdinalIgnoreCase))
                    contradictions.Add($"'{match.Value}' (no {mentionedType.ToLower()} found on {mentionedSquare})");
            }
        }

        if (PinClaimRegex.IsMatch(combined))
        {
            var hasPinMotif = annotation?.Motifs.Any(m => m.StartsWith("Pin:", StringComparison.OrdinalIgnoreCase)) == true;
            if (!hasPinMotif)
            {
                contradictions.Add("Pin claim present without supporting pin motif in tactical annotation.");
            }
        }

        foreach (Match match in AbsoluteClaimRegex.Matches(combined))
        {
            absoluteClaimIndicators.Add(match.Value);
        }

        if (contradictions.Count == 0 && absoluteClaimIndicators.Count == 0)
        {
            return CoachValidationResult.Valid;
        }

        return new CoachValidationResult(
            IsValid: false,
            HasContradictions: contradictions.Count > 0,
            HasAbsoluteClaimRisk: absoluteClaimIndicators.Count > 0,
            Contradictions: contradictions,
            AbsoluteClaimIndicators: absoluteClaimIndicators);
    }
}

public sealed record CoachValidationResult(
    bool IsValid,
    bool HasContradictions,
    bool HasAbsoluteClaimRisk,
    IReadOnlyList<string> Contradictions,
    IReadOnlyList<string> AbsoluteClaimIndicators)
{
    public IReadOnlyList<string> Anomalies => Contradictions;

    public static readonly CoachValidationResult Valid = new(
        true,
        false,
        false,
        Array.Empty<string>(),
        Array.Empty<string>());
}
