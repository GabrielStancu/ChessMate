namespace ChessMate.Infrastructure.BatchCoach;

public static class UciMoveDescriber
{
    private static readonly Dictionary<char, string> PieceLabels = new()
    {
        { 'K', "King" },
        { 'Q', "Queen" },
        { 'R', "Rook" },
        { 'B', "Bishop" },
        { 'N', "Knight" },
        { 'P', "Pawn" },
        { 'k', "King" },
        { 'q', "Queen" },
        { 'r', "Rook" },
        { 'b', "Bishop" },
        { 'n', "Knight" },
        { 'p', "Pawn" }
    };

    /// <summary>
    /// Converts a UCI move string (e.g. "e2e4") into a human-readable description
    /// (e.g. "Pawn from e2 to e4") using the FEN to identify the piece.
    /// </summary>
    public static string Describe(string uciMove, string? fen)
    {
        if (string.IsNullOrWhiteSpace(uciMove) || uciMove.Length < 4)
        {
            return uciMove ?? string.Empty;
        }

        var fromSquare = uciMove.Substring(0, 2);
        var toSquare = uciMove.Substring(2, 2);
        var promotion = uciMove.Length > 4 ? uciMove[4] : (char?)null;

        var pieceName = ResolvePieceName(fromSquare, fen);

        var description = $"{pieceName} from {fromSquare} to {toSquare}";

        if (promotion.HasValue)
        {
            var promoName = char.ToUpper(promotion.Value) switch
            {
                'Q' => "Queen",
                'R' => "Rook",
                'B' => "Bishop",
                'N' => "Knight",
                _ => "piece"
            };
            description += $" (promoting to {promoName})";
        }

        return description;
    }

    private static string ResolvePieceName(string square, string? fen)
    {
        if (string.IsNullOrWhiteSpace(fen) || square.Length != 2)
        {
            return "piece";
        }

        var file = square[0] - 'a';
        var rank = square[1] - '1';

        if (file < 0 || file > 7 || rank < 0 || rank > 7)
        {
            return "piece";
        }

        var fenParts = fen.Split(' ');
        var ranks = fenParts[0].Split('/');

        if (ranks.Length != 8)
        {
            return "piece";
        }

        // FEN ranks go from rank 8 (index 0) to rank 1 (index 7)
        var fenRankIndex = 7 - rank;
        var fenRank = ranks[fenRankIndex];

        var currentFile = 0;
        foreach (var ch in fenRank)
        {
            if (char.IsDigit(ch))
            {
                currentFile += ch - '0';
                continue;
            }

            if (currentFile == file && PieceLabels.TryGetValue(ch, out var label))
            {
                return label;
            }

            currentFile++;
        }

        return "piece";
    }
}
