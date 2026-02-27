using ChessMate.Application.Abstractions;
using ChessMate.Application.ChessCom;
using Microsoft.Extensions.Logging;

namespace ChessMate.Infrastructure.ChessCom;

public sealed class ChessComGamesService : IChessComGamesService
{
    private readonly IGameIndexStore _gameIndexStore;
    private readonly IChessComArchiveClient _archiveClient;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<ChessComGamesService> _logger;
    private const int CacheTtlMinutes = 15;

    public ChessComGamesService(
        IGameIndexStore gameIndexStore,
        IChessComArchiveClient archiveClient,
        TimeProvider timeProvider,
        ILogger<ChessComGamesService> logger)
    {
        _gameIndexStore = gameIndexStore;
        _archiveClient = archiveClient;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<GetGamesPageResult> GetGamesPageAsync(string username, int page, int pageSize, CancellationToken cancellationToken)
    {
        var normalizedUsername = NormalizeUsername(username);
        var cachedGames = await _gameIndexStore.GetPlayerGamesAsync(normalizedUsername, cancellationToken);
        var now = _timeProvider.GetUtcNow();

        if (IsCacheFresh(cachedGames, now))
        {
            _logger.LogInformation(
                "Cache hit for username {Username}. cachedCount {CachedCount}.",
                normalizedUsername,
                cachedGames.Count);

            return BuildPageResult(cachedGames, page, pageSize, now, cacheStatus: "hit");
        }

        var hadCachedGames = cachedGames.Count > 0;
        var requiredCount = checked(page * pageSize + 1);

        _logger.LogInformation(
            "Cache {CacheDecision} for username {Username}. Fetching upstream, requiredCount {RequiredCount}.",
            hadCachedGames ? "stale" : "miss",
            normalizedUsername,
            requiredCount);

        IReadOnlyList<ChessGameSummary> fetchedGames;

        try
        {
            fetchedGames = await _archiveClient.FetchRecentGamesAsync(normalizedUsername, requiredCount, cancellationToken);
        }
        catch (Exception exception)
        {
            throw new ChessComDependencyException("Chess.com games fetch failed.", exception);
        }

        await _gameIndexStore.UpsertPlayerGamesAsync(normalizedUsername, fetchedGames, now, cancellationToken);

        _logger.LogInformation(
            "Upstream fetch completed for username {Username}. fetchedCount {FetchedCount}, cacheStatus {CacheStatus}.",
            normalizedUsername,
            fetchedGames.Count,
            hadCachedGames ? "stale" : "miss");

        var hydratedGames = fetchedGames.Select(game => game with { IngestedAtUtc = now }).ToArray();
        var cacheStatus = hadCachedGames ? "stale" : "miss";

        return BuildPageResult(hydratedGames, page, pageSize, now, cacheStatus);
    }

    private static bool IsCacheFresh(IReadOnlyList<ChessGameSummary> cachedGames, DateTimeOffset now)
    {
        if (cachedGames.Count == 0)
        {
            return false;
        }

        var lastIngestedAtUtc = cachedGames.Max(game => game.IngestedAtUtc);
        if (lastIngestedAtUtc == DateTimeOffset.MinValue)
        {
            return false;
        }

        return lastIngestedAtUtc >= now.AddMinutes(-CacheTtlMinutes);
    }

    private static GetGamesPageResult BuildPageResult(
        IReadOnlyList<ChessGameSummary> sortedGames,
        int page,
        int pageSize,
        DateTimeOffset now,
        string cacheStatus)
    {
        var skip = (page - 1) * pageSize;
        var items = sortedGames.Skip(skip).Take(pageSize).ToArray();
        var hasMore = sortedGames.Count > skip + items.Length;
        var sourceTimestamp = sortedGames.Count > 0
            ? sortedGames.Max(game => game.PlayedAtUtc)
            : now;

        return new GetGamesPageResult(
            items,
            page,
            pageSize,
            hasMore,
            sourceTimestamp,
            cacheStatus,
            CacheTtlMinutes);
    }

    private static string NormalizeUsername(string username)
    {
        return username.Trim().ToLowerInvariant();
    }
}