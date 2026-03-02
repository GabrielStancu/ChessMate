namespace ChessMate.Infrastructure.BatchCoach;

/// <summary>
/// Computes pseudo-legal attack squares for a piece at a given square.
/// For sliding pieces, the ray stops at (and includes) the first occupied square.
/// </summary>
public static class AttackCalculator
{
    private static readonly (int Df, int Dr)[] RookRays = { (0, 1), (0, -1), (1, 0), (-1, 0) };
    private static readonly (int Df, int Dr)[] BishopRays = { (1, 1), (1, -1), (-1, 1), (-1, -1) };
    private static readonly (int Df, int Dr)[] QueenRays = { (0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1) };
    private static readonly (int Df, int Dr)[] KnightDeltas = { (1, 2), (1, -2), (-1, 2), (-1, -2), (2, 1), (2, -1), (-2, 1), (-2, -1) };
    private static readonly (int Df, int Dr)[] KingDeltas = { (0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1) };

    public static IReadOnlyList<int> GetAttackedSquares(int squareIndex, BoardPiece piece, BoardSnapshot board)
    {
        var file = squareIndex % 8;
        var rank = squareIndex / 8;

        return piece.Type switch
        {
            PieceType.Rook => RayAttacks(file, rank, RookRays, board),
            PieceType.Bishop => RayAttacks(file, rank, BishopRays, board),
            PieceType.Queen => RayAttacks(file, rank, QueenRays, board),
            PieceType.Knight => JumpAttacks(file, rank, KnightDeltas),
            PieceType.King => JumpAttacks(file, rank, KingDeltas),
            PieceType.Pawn => PawnAttacks(file, rank, piece.Color),
            _ => Array.Empty<int>()
        };
    }

    private static IReadOnlyList<int> RayAttacks(int file, int rank, (int Df, int Dr)[] rays, BoardSnapshot board)
    {
        var result = new List<int>();

        foreach (var (df, dr) in rays)
        {
            var f = file + df;
            var r = rank + dr;

            while (f is >= 0 and <= 7 && r is >= 0 and <= 7)
            {
                var sq = r * 8 + f;
                result.Add(sq);
                if (board.PieceAt(sq) is not null) break;
                f += df;
                r += dr;
            }
        }

        return result;
    }

    private static IReadOnlyList<int> JumpAttacks(int file, int rank, (int Df, int Dr)[] deltas)
    {
        var result = new List<int>(deltas.Length);

        foreach (var (df, dr) in deltas)
        {
            var f = file + df;
            var r = rank + dr;
            if (f is >= 0 and <= 7 && r is >= 0 and <= 7)
                result.Add(r * 8 + f);
        }

        return result;
    }

    private static IReadOnlyList<int> PawnAttacks(int file, int rank, PieceColor color)
    {
        var dr = color == PieceColor.White ? 1 : -1;
        var result = new List<int>(2);

        if (file > 0) result.Add((rank + dr) * 8 + (file - 1));
        if (file < 7) result.Add((rank + dr) * 8 + (file + 1));

        return result.Where(s => s is >= 0 and < 64).ToList();
    }
}
