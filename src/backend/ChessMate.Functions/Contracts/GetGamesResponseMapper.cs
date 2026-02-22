using ChessMate.Application.ChessCom;

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

    public static GetGamesResponseEnvelope Create(GetGamesPageResult pageResult)
    {
        var items = pageResult.Items
            .Select(item => new GetGamesItemEnvelope(
                item.GameId,
                item.PlayedAtUtc,
                item.Opponent,
                item.Result,
                item.Opening,
                item.TimeControl,
                item.Url))
            .ToArray();

        return new GetGamesResponseEnvelope(
            SchemaVersion,
            items,
            pageResult.Page,
            pageResult.PageSize,
            pageResult.HasMore,
            pageResult.SourceTimestamp,
            pageResult.CacheStatus,
            pageResult.CacheTtlMinutes);
    }
}