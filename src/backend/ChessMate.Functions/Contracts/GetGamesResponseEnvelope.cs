namespace ChessMate.Functions.Contracts;

public sealed record GetGamesResponseEnvelope(
    string SchemaVersion,
    IReadOnlyList<GetGamesItemEnvelope> Items,
    int Page,
    int PageSize,
    bool HasMore,
    DateTimeOffset SourceTimestamp,
    string CacheStatus,
    int CacheTtlMinutes);