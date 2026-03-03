using ChessMate.Application.Abstractions;
using ChessMate.Application.ChessCom;
using Microsoft.Extensions.Logging;

namespace ChessMate.Infrastructure.ChessCom;

public sealed class ChessComGamesService : IChessComGamesService
{
    private readonly IGameIndexStore _gameIndexStore;
    private readonly IChessComArchiveClient _archiveClient;
    private readonly IChessComPlayerProfileClient _profileClient;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<ChessComGamesService> _logger;
    private const int CacheTtlMinutes = 15;

    public ChessComGamesService(
        IGameIndexStore gameIndexStore,
        IChessComArchiveClient archiveClient,
        IChessComPlayerProfileClient profileClient,
        TimeProvider timeProvider,
        ILogger<ChessComGamesService> logger)
    {
        _gameIndexStore = gameIndexStore;
        _archiveClient = archiveClient;
        _profileClient = profileClient;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<GetGamesPageResult> GetGamesPageAsync(
        string username,
        int page,
        int pageSize,
        CancellationToken cancellationToken,
        bool forceRefresh = false)
    {
        var normalizedUsername = NormalizeUsername(username);
        var cachedGames = await _gameIndexStore.GetPlayerGamesAsync(normalizedUsername, cancellationToken);
        var now = _timeProvider.GetUtcNow();

        if (!forceRefresh && IsCacheFresh(cachedGames, now))
        {
            _logger.LogInformation(
                "Cache hit for username {Username}. cachedCount {CachedCount}.",
                normalizedUsername,
                cachedGames.Count);

            var cachedPageResult = BuildPageResult(cachedGames, page, pageSize, now, cacheStatus: "hit");
            var enrichedCached = await EnrichWithProfilesAsync(cachedPageResult.Items, cancellationToken);
            return cachedPageResult with { Items = enrichedCached };
        }

        var hadCachedGames = cachedGames.Count > 0;
        var requiredCount = checked(page * pageSize + 1);
        var cacheDecision = forceRefresh
            ? "bypassed"
            : hadCachedGames
                ? "stale"
                : "miss";

        _logger.LogInformation(
            "Cache {CacheDecision} for username {Username}. Fetching upstream, requiredCount {RequiredCount}.",
            cacheDecision,
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
            cacheDecision);

        var hydratedGames = fetchedGames.Select(game => game with { IngestedAtUtc = now }).ToArray();
        var cacheStatus = forceRefresh ? "bypassed" : hadCachedGames ? "stale" : "miss";

        var pageResult = BuildPageResult(hydratedGames, page, pageSize, now, cacheStatus);
        var enrichedItems = await EnrichWithProfilesAsync(pageResult.Items, cancellationToken);
        return pageResult with { Items = enrichedItems };
    }

    private async Task<IReadOnlyList<ChessGameSummary>> EnrichWithProfilesAsync(
        IReadOnlyList<ChessGameSummary> items,
        CancellationToken cancellationToken)
    {
        var uniqueUsernames = items
            .SelectMany(s => new[] { s.WhitePlayer, s.BlackPlayer })
            .Select(u => u.Trim().ToLowerInvariant())
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var profileFetches = uniqueUsernames.ToDictionary(
            u => u,
            u => _profileClient.GetPlayerProfileAsync(u, cancellationToken));

        await Task.WhenAll(profileFetches.Values);

        var profiles = profileFetches.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.Result,
            StringComparer.Ordinal);

        return items
            .Select(s =>
            {
                profiles.TryGetValue(s.WhitePlayer.Trim().ToLowerInvariant(), out var white);
                profiles.TryGetValue(s.BlackPlayer.Trim().ToLowerInvariant(), out var black);
                return s with
                {
                    WhiteAvatarUrl = white?.AvatarUrl,
                    BlackAvatarUrl = black?.AvatarUrl,
                    WhiteCountry = white?.CountryCode,
                    BlackCountry = black?.CountryCode
                };
            })
            .ToArray();
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