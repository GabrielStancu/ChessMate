using System.Text;

namespace ChessMate.Infrastructure.BatchCoach;

public static class FenBoardDescriber
{
    private static readonly Dictionary<char, string> PieceNames = new()
    {
        { 'K', "White King" },
        { 'Q', "White Queen" },
        { 'R', "White Rook" },
        { 'B', "White Bishop" },
        { 'N', "White Knight" },
        { 'P', "White Pawn" },
        { 'k', "Black King" },
        { 'q', "Black Queen" },
        { 'r', "Black Rook" },
        { 'b', "Black Bishop" },
        { 'n', "Black Knight" },
        { 'p', "Black Pawn" }
    };

    /// <summary>
    /// Converts a FEN string into a human-readable piece list grouped by color.
    /// Example output:
    /// White pieces: King on e1, Queen on d1, Rook on a1, Rook on h1, ...
    /// Black pieces: King on e8, Queen on d8, Rook on a8, Rook on h8, ...
    /// </summary>
    public static string Describe(string fen)
    {
        if (string.IsNullOrWhiteSpace(fen))
        {
            return string.Empty;
        }

        var fenParts = fen.Split(' ');
        var piecePlacement = fenParts[0];
        var ranks = piecePlacement.Split('/');

        if (ranks.Length != 8)
        {
            return string.Empty;
        }

        var whitePieces = new List<string>();
        var blackPieces = new List<string>();

        for (int rankIndex = 0; rankIndex < 8; rankIndex++)
        {
            var rankNumber = 8 - rankIndex;
            var fileIndex = 0;

            foreach (var ch in ranks[rankIndex])
            {
                if (char.IsDigit(ch))
                {
                    fileIndex += ch - '0';
                    continue;
                }

                if (fileIndex > 7)
                {
                    break;
                }

                var square = $"{(char)('a' + fileIndex)}{rankNumber}";

                if (PieceNames.TryGetValue(ch, out var pieceName))
                {
                    var entry = $"{pieceName} on {square}";

                    if (char.IsUpper(ch))
                    {
                        whitePieces.Add(entry);
                    }
                    else
                    {
                        blackPieces.Add(entry);
                    }
                }

                fileIndex++;
            }
        }

        var builder = new StringBuilder();
        builder.AppendLine($"White pieces: {string.Join(", ", whitePieces)}");
        builder.AppendLine($"Black pieces: {string.Join(", ", blackPieces)}");

        if (fenParts.Length > 1)
        {
            var sideToMove = fenParts[1] == "w" ? "White" : "Black";
            builder.AppendLine($"Side to move: {sideToMove}");
        }

        return builder.ToString().TrimEnd();
    }
}
