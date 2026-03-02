namespace ChessMate.Infrastructure.BatchCoach;

/// <summary>
/// Immutable board state parsed from a FEN string. Square indexing: rank * 8 + file
/// where file 0 = 'a' and rank 0 = rank 1 in chess notation (a1 = index 0, h8 = index 63).
/// </summary>
public sealed class BoardSnapshot
{
    private readonly BoardPiece?[] _squares = new BoardPiece?[64];

    private BoardSnapshot() { }

    public PieceColor SideToMove { get; private set; } = PieceColor.White;

    public BoardPiece? PieceAt(int squareIndex) =>
        squareIndex is >= 0 and < 64 ? _squares[squareIndex] : null;

    public IReadOnlyList<(int Square, BoardPiece Piece)> AllPieces()
    {
        var result = new List<(int, BoardPiece)>(32);
        for (var i = 0; i < 64; i++)
        {
            if (_squares[i] is { } piece)
                result.Add((i, piece));
        }
        return result;
    }

    public static int? ParseSquare(string? notation)
    {
        if (notation is not { Length: 2 }) return null;
        var file = notation[0] - 'a';
        var rank = notation[1] - '1';
        if (file is < 0 or > 7 || rank is < 0 or > 7) return null;
        return rank * 8 + file;
    }

    public static string SquareName(int index)
    {
        var file = index % 8;
        var rank = index / 8;
        return $"{(char)('a' + file)}{rank + 1}";
    }

    public static BoardSnapshot? TryParse(string? fen)
    {
        if (string.IsNullOrWhiteSpace(fen)) return null;

        var parts = fen.Trim().Split(' ');
        var ranks = parts[0].Split('/');
        if (ranks.Length != 8) return null;

        var snapshot = new BoardSnapshot();

        for (var fenRankIndex = 0; fenRankIndex < 8; fenRankIndex++)
        {
            var boardRank = 7 - fenRankIndex;
            var file = 0;

            foreach (var ch in ranks[fenRankIndex])
            {
                if (char.IsDigit(ch))
                {
                    file += ch - '0';
                    continue;
                }

                if (file > 7) break;

                var piece = CharToPiece(ch);
                if (piece is not null)
                    snapshot._squares[boardRank * 8 + file] = piece;

                file++;
            }
        }

        snapshot.SideToMove = parts.Length > 1 && parts[1] == "b"
            ? PieceColor.Black
            : PieceColor.White;

        return snapshot;
    }

    private static BoardPiece? CharToPiece(char c) => c switch
    {
        'P' => new BoardPiece(PieceType.Pawn, PieceColor.White),
        'N' => new BoardPiece(PieceType.Knight, PieceColor.White),
        'B' => new BoardPiece(PieceType.Bishop, PieceColor.White),
        'R' => new BoardPiece(PieceType.Rook, PieceColor.White),
        'Q' => new BoardPiece(PieceType.Queen, PieceColor.White),
        'K' => new BoardPiece(PieceType.King, PieceColor.White),
        'p' => new BoardPiece(PieceType.Pawn, PieceColor.Black),
        'n' => new BoardPiece(PieceType.Knight, PieceColor.Black),
        'b' => new BoardPiece(PieceType.Bishop, PieceColor.Black),
        'r' => new BoardPiece(PieceType.Rook, PieceColor.Black),
        'q' => new BoardPiece(PieceType.Queen, PieceColor.Black),
        'k' => new BoardPiece(PieceType.King, PieceColor.Black),
        _ => null
    };
}
