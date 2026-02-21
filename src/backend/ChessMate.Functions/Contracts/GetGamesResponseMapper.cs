namespace ChessMate.Functions.Contracts;

public static class GetGamesResponseMapper
{
    private const string SchemaVersion = "1.0";
    private const int CacheTtlMinutes = 15;
    private const string CacheStatus = "miss";

    public static GetGamesResponseEnvelope CreateEmpty(int page, int pageSize, DateTimeOffset sourceTimestamp)
    {
        return new GetGamesResponseEnvelope(
            SchemaVersion,
            [],
            page,
            pageSize,
            false,
            sourceTimestamp,
            CacheStatus,
            CacheTtlMinutes);
    }
}