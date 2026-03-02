namespace ChessMate.Infrastructure.BatchCoach;

/// <summary>
/// Analyzes a board position (from FEN) to produce a <see cref="TacticalAnnotation"/> containing:
/// - a list of detected tactical motifs (fork, pin, skewer, hanging piece, discovered attack)
/// - a legal captures table that grounds the LLM and prevents hallucinated capture claims.
/// All analysis is performed on FenAfter — the position produced by the bad move.
/// </summary>
public static class TacticalAnnotator
{
    public static TacticalAnnotation Annotate(string? fenAfter, string? fromSquareNotation, string? toSquareNotation)
    {
        var board = BoardSnapshot.TryParse(fenAfter);
        if (board is null)
            return TacticalAnnotation.Empty;

        var capturesText = BuildLegalCapturesText(board);
        var motifs = DetectMotifs(board, fromSquareNotation, toSquareNotation);
        return new TacticalAnnotation(motifs, capturesText);
    }

    private static string BuildLegalCapturesText(BoardSnapshot board)
    {
        var lines = new List<string>();

        foreach (var (sq, piece) in board.AllPieces())
        {
            var attacks = AttackCalculator.GetAttackedSquares(sq, piece, board);

            foreach (var target in attacks)
            {
                var targetPiece = board.PieceAt(target);
                if (targetPiece is null || targetPiece.Color == piece.Color) continue;

                lines.Add(
                    $"{piece.ColorName} {piece.TypeName} on {BoardSnapshot.SquareName(sq)} " +
                    $"can capture {targetPiece.ColorName} {targetPiece.TypeName} on {BoardSnapshot.SquareName(target)}");
            }
        }

        return lines.Count > 0
            ? string.Join(Environment.NewLine, lines)
            : "(no captures available in this position)";
    }

    private static IReadOnlyList<string> DetectMotifs(BoardSnapshot board, string? fromSquareNotation, string? toSquareNotation)
    {
        var motifs = new List<string>();
        var opponentColor = board.SideToMove;
        var badMoverColor = opponentColor == PieceColor.White ? PieceColor.Black : PieceColor.White;
        var fromIndex = BoardSnapshot.ParseSquare(fromSquareNotation);

        DetectHangingPieces(board, opponentColor, badMoverColor, motifs);
        DetectForks(board, opponentColor, badMoverColor, motifs);
        DetectPinsAndSkewers(board, opponentColor, badMoverColor, motifs);

        if (fromIndex.HasValue)
            DetectDiscoveredAttacks(board, opponentColor, badMoverColor, fromIndex.Value, motifs);

        return motifs;
    }

    private static void DetectHangingPieces(
        BoardSnapshot board,
        PieceColor opponentColor,
        PieceColor badMoverColor,
        List<string> motifs)
    {
        foreach (var (sq, piece) in board.AllPieces())
        {
            if (piece.Color != badMoverColor) continue;

            var attackers = GetAttackerSquares(board, sq, opponentColor);
            if (attackers.Count == 0) continue;

            var defenders = GetAttackerSquares(board, sq, badMoverColor);
            if (defenders.Count > 0) continue;

            var firstAttacker = board.PieceAt(attackers[0])!;
            motifs.Add(
                $"Hanging piece: {piece.ColorName} {piece.TypeName} on {BoardSnapshot.SquareName(sq)} " +
                $"is undefended and can be captured by {firstAttacker.ColorName} {firstAttacker.TypeName} on {BoardSnapshot.SquareName(attackers[0])}");
        }
    }

    private static void DetectForks(
        BoardSnapshot board,
        PieceColor opponentColor,
        PieceColor badMoverColor,
        List<string> motifs)
    {
        foreach (var (sq, piece) in board.AllPieces())
        {
            if (piece.Color != opponentColor) continue;

            var attacks = AttackCalculator.GetAttackedSquares(sq, piece, board);
            var threatenedPieces = attacks
                .Where(a => board.PieceAt(a)?.Color == badMoverColor && board.PieceAt(a)?.Type != PieceType.Pawn)
                .Select(a => (Square: a, Piece: board.PieceAt(a)!))
                .ToList();

            if (threatenedPieces.Count < 2) continue;

            var targets = string.Join(" and ",
                threatenedPieces.Take(3).Select(t => $"{t.Piece.TypeName} on {BoardSnapshot.SquareName(t.Square)}"));

            motifs.Add(
                $"Fork: {piece.ColorName} {piece.TypeName} on {BoardSnapshot.SquareName(sq)} " +
                $"attacks {targets} simultaneously");
        }
    }

    private static void DetectPinsAndSkewers(
        BoardSnapshot board,
        PieceColor opponentColor,
        PieceColor badMoverColor,
        List<string> motifs)
    {
        foreach (var (sq, piece) in board.AllPieces())
        {
            if (piece.Color != opponentColor || !piece.IsSlider) continue;

            var pieceFile = sq % 8;
            var pieceRank = sq / 8;

            foreach (var (df, dr) in GetValidDirections(piece.Type))
            {
                var enemyOnRay = CollectEnemyPiecesOnRay(board, pieceFile, pieceRank, df, dr, badMoverColor, opponentColor);
                if (enemyOnRay.Count < 2) continue;

                var first = enemyOnRay[0];
                var second = enemyOnRay[1];

                if (first.Piece.Type != PieceType.King && second.Piece.Type == PieceType.King)
                {
                    motifs.Add(
                        $"Pin: {piece.ColorName} {piece.TypeName} on {BoardSnapshot.SquareName(sq)} " +
                        $"pins {first.Piece.ColorName} {first.Piece.TypeName} on {BoardSnapshot.SquareName(first.Square)} " +
                        $"against the {second.Piece.ColorName} King on {BoardSnapshot.SquareName(second.Square)}");
                    continue;
                }

                if (first.Piece.MaterialValue > second.Piece.MaterialValue)
                {
                    motifs.Add(
                        $"Skewer: {piece.ColorName} {piece.TypeName} on {BoardSnapshot.SquareName(sq)} " +
                        $"skewers {first.Piece.ColorName} {first.Piece.TypeName} on {BoardSnapshot.SquareName(first.Square)}, " +
                        $"exposing {second.Piece.ColorName} {second.Piece.TypeName} on {BoardSnapshot.SquareName(second.Square)}");
                }
            }
        }
    }

    private static void DetectDiscoveredAttacks(
        BoardSnapshot board,
        PieceColor opponentColor,
        PieceColor badMoverColor,
        int fromIndex,
        List<string> motifs)
    {
        var fromFile = fromIndex % 8;
        var fromRank = fromIndex / 8;

        foreach (var (sq, piece) in board.AllPieces())
        {
            if (piece.Color != opponentColor || !piece.IsSlider) continue;

            var pieceFile = sq % 8;
            var pieceRank = sq / 8;

            var df = Math.Sign(fromFile - pieceFile);
            var dr = Math.Sign(fromRank - pieceRank);

            if (df == 0 && dr == 0) continue;
            if (!IsDirectionValid(piece.Type, df, dr)) continue;

            // Confirm fromIndex is reachable on this ray without any blocking pieces before it
            if (!IsSquareOnUnblockedRay(board, pieceFile, pieceRank, df, dr, fromFile, fromRank)) continue;

            // fromIndex is empty in FenAfter (piece moved away); walk further for a badMover target
            var f = fromFile + df;
            var r = fromRank + dr;

            while (f is >= 0 and <= 7 && r is >= 0 and <= 7)
            {
                var target = r * 8 + f;
                var targetPiece = board.PieceAt(target);

                if (targetPiece is not null)
                {
                    if (targetPiece.Color == badMoverColor)
                    {
                        motifs.Add(
                            $"Discovered attack: vacating {BoardSnapshot.SquareName(fromIndex)} revealed " +
                            $"{piece.ColorName} {piece.TypeName} on {BoardSnapshot.SquareName(sq)} " +
                            $"attacking {targetPiece.ColorName} {targetPiece.TypeName} on {BoardSnapshot.SquareName(target)}");
                    }
                    break;
                }

                f += df;
                r += dr;
            }
        }
    }

    private static List<(int Square, BoardPiece Piece)> CollectEnemyPiecesOnRay(
        BoardSnapshot board,
        int startFile,
        int startRank,
        int df,
        int dr,
        PieceColor enemyColor,
        PieceColor ownColor)
    {
        var result = new List<(int, BoardPiece)>(2);
        var f = startFile + df;
        var r = startRank + dr;

        while (f is >= 0 and <= 7 && r is >= 0 and <= 7)
        {
            var target = r * 8 + f;
            var targetPiece = board.PieceAt(target);

            if (targetPiece is not null)
            {
                if (targetPiece.Color == enemyColor)
                    result.Add((target, targetPiece));
                else
                    break; // blocked by own piece

                if (result.Count >= 2) break;
            }

            f += df;
            r += dr;
        }

        return result;
    }

    private static bool IsSquareOnUnblockedRay(BoardSnapshot board, int pieceFile, int pieceRank, int df, int dr, int targetFile, int targetRank)
    {
        var f = pieceFile + df;
        var r = pieceRank + dr;

        while (f is >= 0 and <= 7 && r is >= 0 and <= 7)
        {
            if (f == targetFile && r == targetRank) return true;
            if (board.PieceAt(r * 8 + f) is not null) return false;
            f += df;
            r += dr;
        }

        return false;
    }

    private static IReadOnlyList<int> GetAttackerSquares(BoardSnapshot board, int targetSquare, PieceColor attackerColor)
    {
        var result = new List<int>();

        foreach (var (sq, piece) in board.AllPieces())
        {
            if (piece.Color != attackerColor) continue;
            if (AttackCalculator.GetAttackedSquares(sq, piece, board).Contains(targetSquare))
                result.Add(sq);
        }

        return result;
    }

    private static (int Df, int Dr)[] GetValidDirections(PieceType type) => type switch
    {
        PieceType.Rook => new (int, int)[] { (0, 1), (0, -1), (1, 0), (-1, 0) },
        PieceType.Bishop => new (int, int)[] { (1, 1), (1, -1), (-1, 1), (-1, -1) },
        PieceType.Queen => new (int, int)[] { (0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1) },
        _ => Array.Empty<(int, int)>()
    };

    private static bool IsDirectionValid(PieceType type, int df, int dr)
    {
        if (type == PieceType.Rook) return df == 0 || dr == 0;
        if (type == PieceType.Bishop) return Math.Abs(df) == Math.Abs(dr) && df != 0;
        if (type == PieceType.Queen) return df == 0 || dr == 0 || (Math.Abs(df) == Math.Abs(dr) && df != 0);
        return false;
    }
}
