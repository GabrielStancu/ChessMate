namespace ChessMate.Functions.Contracts;

public sealed record ErrorResponseEnvelope(
    string SchemaVersion,
    string CorrelationId,
    string Code,
    string Message,
    IReadOnlyDictionary<string, string[]>? Errors = null);