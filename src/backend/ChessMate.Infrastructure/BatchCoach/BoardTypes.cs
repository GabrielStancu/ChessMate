namespace ChessMate.Infrastructure.BatchCoach;

public enum PieceColor { White, Black }

public enum PieceType { Pawn, Knight, Bishop, Rook, Queen, King }

public sealed record BoardPiece(PieceType Type, PieceColor Color)
{
    public string TypeName => Type.ToString();
    public string ColorName => Color.ToString();

    public bool IsSlider => Type is PieceType.Bishop or PieceType.Rook or PieceType.Queen;

    public int MaterialValue => Type switch
    {
        PieceType.Pawn => 1,
        PieceType.Knight => 3,
        PieceType.Bishop => 3,
        PieceType.Rook => 5,
        PieceType.Queen => 9,
        PieceType.King => 100,
        _ => 0
    };
}
