using ChessMate.Functions.Contracts;

namespace ChessMate.Functions.BatchCoach;

public static class BatchCoachClassificationPolicy
{
    public static readonly IReadOnlyList<string> EligibleClassifications = ["Inaccuracy", "Mistake", "Miss", "Blunder"];

    public static IReadOnlyList<BatchCoachMoveEnvelope> SelectEligibleMoves(IReadOnlyList<BatchCoachMoveEnvelope> moves)
    {
        if (moves.Count == 0)
        {
            return [];
        }

        return moves
            .Where(move => IsEligible(move.Classification))
            .ToArray();
    }

    public static bool IsEligible(string? classification)
    {
        if (string.IsNullOrWhiteSpace(classification))
        {
            return false;
        }

        return EligibleClassifications.Any(candidate =>
            string.Equals(candidate, classification, StringComparison.OrdinalIgnoreCase));
    }
}
