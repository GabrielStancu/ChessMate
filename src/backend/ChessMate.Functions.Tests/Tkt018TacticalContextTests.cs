using ChessMate.Infrastructure.BatchCoach;

namespace ChessMate.Functions.Tests;

/// <summary>
/// Regression tests for TKT-018: tactical context injection, legal captures grounding,
/// and post-generation hallucination detection.
/// </summary>
public sealed class Tkt018TacticalContextTests
{
    // ── AttackCalculator ────────────────────────────────────────────────────────

    [Fact]
    public void AttackCalculator_Knight_DoesNotWrapAcrossFiles()
    {
        // Knight on a1 (file 0, rank 0) — left-side jumps must not wrap to h-file
        var board = BoardSnapshot.TryParse("8/8/8/8/8/8/8/N7 w - - 0 1")!;
        var attacks = AttackCalculator.GetAttackedSquares(0, new BoardPiece(PieceType.Knight, PieceColor.White), board);

        // Valid knight moves from a1: b3 (1,2) and c2 (2,1) only
        var squareNames = attacks.Select(BoardSnapshot.SquareName).ToList();
        Assert.Contains("b3", squareNames);
        Assert.Contains("c2", squareNames);
        Assert.DoesNotContain("g2", squareNames); // would be a file-wrap artefact
        Assert.DoesNotContain("h2", squareNames);
    }

    [Fact]
    public void AttackCalculator_Bishop_StopsAtBlockingPiece()
    {
        // White Bishop on a1, White Pawn on c3 — ray should stop at the pawn square (inclusive)
        var board = BoardSnapshot.TryParse("8/8/8/8/8/2P5/8/B7 w - - 0 1")!;
        var bishop = new BoardPiece(PieceType.Bishop, PieceColor.White);
        var attacks = AttackCalculator.GetAttackedSquares(0, bishop, board).Select(BoardSnapshot.SquareName).ToList();

        Assert.Contains("b2", attacks);
        Assert.Contains("c3", attacks); // includes the blocking square
        Assert.DoesNotContain("d4", attacks); // blocked by c3
    }

    // ── Legal captures table ────────────────────────────────────────────────────

    [Fact]
    public void LegalCaptures_ExcludesBishopCaptureOnNonDiagonalSquare()
    {
        // Black Bishop on h5, White Knight on g3, White King on d1.
        // h5→g3 is NOT a valid diagonal, so "Black Bishop on h5 can capture ... g3" must NOT appear.
        // h5→d1 IS valid (SW diagonal: g4→f3→e2→d1), so bishop capturing king must appear.
        // Note: "White Knight on g3 can capture Black Bishop on h5" IS valid (1+2 knight move) and will appear.
        var annotation = TacticalAnnotator.Annotate(
            "8/8/8/7b/8/6N1/8/3K2k1 b - - 0 1", null, null);

        // The illegal direction: bishop claiming to reach g3
        Assert.DoesNotContain(
            annotation.LegalCapturesText.Split('\n'),
            line => line.StartsWith("Black Bishop on h5 can capture") && line.Contains("g3"));

        // The legal direction: bishop can reach d1 along the SW diagonal
        Assert.Contains(
            annotation.LegalCapturesText.Split('\n'),
            line => line.Contains("Black Bishop on h5 can capture") && line.Contains("King on d1"));
    }

    [Fact]
    public void LegalCaptures_ReturnsNoCapturesMessage_WhenBoardHasNoCaptures()
    {
        // Lone White King — no captures possible
        var annotation = TacticalAnnotator.Annotate("8/8/8/8/8/8/8/4K3 w - - 0 1", null, null);

        Assert.Contains("no captures available", annotation.LegalCapturesText, StringComparison.OrdinalIgnoreCase);
    }

    // ── Motif: Fork ─────────────────────────────────────────────────────────────

    [Fact]
    public void Motifs_DetectsFork_WhenPieceAttacksTwoNonPawnEnemies()
    {
        // White Knight on d4 attacks Black Rooks on c6 and e6 simultaneously.
        // White to move → opponentColor = White, badMoverColor = Black.
        var annotation = TacticalAnnotator.Annotate(
            "8/8/2r1r3/8/3N4/8/8/7K w - - 0 1", null, null);

        Assert.Contains(annotation.Motifs,
            m => m.StartsWith("Fork:", StringComparison.OrdinalIgnoreCase) && m.Contains("Knight on d4"));
    }

    // ── Motif: Hanging piece ────────────────────────────────────────────────────

    [Fact]
    public void Motifs_DetectsHangingPiece_WhenNoDefendersPresent()
    {
        // White Queen on e1 attacks Black Rook on e4; Black King on h8 is too far to defend.
        // White to move → opponentColor = White, badMoverColor = Black.
        var annotation = TacticalAnnotator.Annotate(
            "7k/8/8/8/4r3/8/8/4Q1K1 w - - 0 1", null, null);

        Assert.Contains(annotation.Motifs,
            m => m.Contains("Hanging", StringComparison.OrdinalIgnoreCase) && m.Contains("Rook on e4"));
    }

    // ── Motif: Absolute Pin ─────────────────────────────────────────────────────

    [Fact]
    public void Motifs_DetectsAbsolutePin_WhenPieceIsOnRayBetweenAttackerAndKing()
    {
        // Black Rook on e8 → White Knight on e4 → White King on e1 (all on e-file).
        // Black to move → opponentColor = Black, badMoverColor = White.
        var annotation = TacticalAnnotator.Annotate(
            "4r3/8/8/8/4N3/8/8/4K3 b - - 0 1", null, null);

        Assert.Contains(annotation.Motifs,
            m => m.StartsWith("Pin:", StringComparison.OrdinalIgnoreCase) && m.Contains("Knight on e4"));
    }

    // ── Motif: Discovered attack ────────────────────────────────────────────────

    [Fact]
    public void Motifs_DetectsDiscoveredAttack_WhenVacatedSquareUnblocksSlider()
    {
        // Black Rook on a8, White Pawn was on a5 but moved (fromSquare = a5 → toSquare = b6).
        // In FenAfter a5 is empty, so Black Rook on a8 now attacks White King on a1 through a5.
        // Black to move → opponentColor = Black, badMoverColor = White.
        var annotation = TacticalAnnotator.Annotate(
            "r7/8/8/8/8/8/8/K7 b - - 0 1", "a5", "b6");

        Assert.Contains(annotation.Motifs,
            m => m.Contains("Discovered attack", StringComparison.OrdinalIgnoreCase) && m.Contains("Rook on a8"));
    }

    // ── CoachResponseValidator ──────────────────────────────────────────────────

    [Fact]
    public void Validator_FlagsHallucinatedPieceMention()
    {
        // Board has only a White King on e1 — "bishop on c4" is fabricated
        var board = BoardSnapshot.TryParse("8/8/8/8/8/8/8/4K3 w - - 0 1")!;

        var result = CoachResponseValidator.Validate(
            "The bishop on c4 attacks the knight.",
            "Opponent can exploit with the rook on a8.",
            "Move the queen.",
            board);

        Assert.False(result.IsValid);
        Assert.Contains(result.Anomalies, a => a.Contains("bishop") && a.Contains("c4"));
    }

    [Fact]
    public void Validator_AcceptsCorrectPieceMentions()
    {
        // Board: White Rook on a1, White King on e1
        var board = BoardSnapshot.TryParse("8/8/8/8/8/8/8/R3K3 w - - 0 1")!;

        var result = CoachResponseValidator.Validate(
            "The rook on a1 controls the open file.",
            "The king on e1 is exposed.",
            "Activate the rook.",
            board);

        Assert.True(result.IsValid);
        Assert.Empty(result.Anomalies);
    }

    [Fact]
    public void Validator_ReturnsValid_WhenBoardIsNull()
    {
        var result = CoachResponseValidator.Validate("any text", "any text", "any text", null);

        Assert.True(result.IsValid);
    }

    // ── BoardSnapshot ───────────────────────────────────────────────────────────

    [Fact]
    public void BoardSnapshot_ParsesStartingPosition_Correctly()
    {
        var board = BoardSnapshot.TryParse("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")!;

        Assert.NotNull(board);
        Assert.Equal(PieceColor.White, board.SideToMove);
        Assert.Equal(PieceType.Rook, board.PieceAt(BoardSnapshot.ParseSquare("a1")!.Value)!.Type);
        Assert.Equal(PieceColor.White, board.PieceAt(BoardSnapshot.ParseSquare("a1")!.Value)!.Color);
        Assert.Equal(PieceType.King, board.PieceAt(BoardSnapshot.ParseSquare("e8")!.Value)!.Type);
        Assert.Equal(PieceColor.Black, board.PieceAt(BoardSnapshot.ParseSquare("e8")!.Value)!.Color);
    }

    [Fact]
    public void BoardSnapshot_ReturnsNull_ForInvalidFen()
    {
        Assert.Null(BoardSnapshot.TryParse(null));
        Assert.Null(BoardSnapshot.TryParse(""));
        Assert.Null(BoardSnapshot.TryParse("not/valid"));
    }
}
