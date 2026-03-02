namespace ChessMate.Infrastructure.BatchCoach;

public sealed record TacticalAnnotation(IReadOnlyList<string> Motifs, string LegalCapturesText)
{
    public static readonly TacticalAnnotation Empty = new(Array.Empty<string>(), string.Empty);

    public bool HasContent => Motifs.Count > 0 || !string.IsNullOrWhiteSpace(LegalCapturesText);
}
