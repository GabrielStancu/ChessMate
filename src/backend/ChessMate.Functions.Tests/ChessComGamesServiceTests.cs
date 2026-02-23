using ChessMate.Application.ChessCom;
using ChessMate.Infrastructure.ChessCom;

namespace ChessMate.Functions.Tests;

public sealed class ChessComGamesServiceTests
{
    [Fact]
    public async Task GetGamesPageAsync_OnCacheMiss_FetchesUpstreamAndUpserts()
    {
        var now = new DateTimeOffset(2026, 2, 22, 10, 0, 0, TimeSpan.Zero);
        var timeProvider = new StubTimeProvider(now);
        var store = new FakeGameIndexStore([]);
        var upstreamGames = ChessGameSummaryFactory.BuildGames(13, now.AddHours(-1), DateTimeOffset.MinValue);
        var archiveClient = new FakeArchiveClient(upstreamGames);
        var service = new ChessComGamesService(store, archiveClient, timeProvider);

        var result = await service.GetGamesPageAsync("  Test_User ", 1, 12, CancellationToken.None);

        Assert.Equal("miss", result.CacheStatus);
        Assert.Equal(12, result.Items.Count);
        Assert.True(result.HasMore);
        Assert.Equal(upstreamGames.Max(game => game.PlayedAtUtc), result.SourceTimestamp);
        Assert.Equal(1, archiveClient.CallCount);
        Assert.Equal("test_user", store.LastUpsertUsername);
        Assert.Equal(1, store.UpsertCount);
    }

    [Fact]
    public async Task GetGamesPageAsync_OnFreshCache_ReturnsHitWithoutUpstreamCall()
    {
        var now = new DateTimeOffset(2026, 2, 22, 10, 0, 0, TimeSpan.Zero);
        var timeProvider = new StubTimeProvider(now);
        var cachedGames = ChessGameSummaryFactory.BuildGames(12, now.AddMinutes(-30), now.AddMinutes(-2));
        var store = new FakeGameIndexStore(cachedGames);
        var archiveClient = new FakeArchiveClient([]);
        var service = new ChessComGamesService(store, archiveClient, timeProvider);

        var result = await service.GetGamesPageAsync("test_user", 1, 12, CancellationToken.None);

        Assert.Equal("hit", result.CacheStatus);
        Assert.Equal(12, result.Items.Count);
        Assert.False(result.HasMore);
        Assert.Equal(0, archiveClient.CallCount);
        Assert.Equal(0, store.UpsertCount);
    }

    [Fact]
    public async Task GetGamesPageAsync_OnStaleCache_WhenUpstreamFails_ThrowsDependencyException()
    {
        var now = new DateTimeOffset(2026, 2, 22, 10, 0, 0, TimeSpan.Zero);
        var timeProvider = new StubTimeProvider(now);
        var staleGames = ChessGameSummaryFactory.BuildGames(12, now.AddHours(-2), now.AddMinutes(-16));
        var store = new FakeGameIndexStore(staleGames);
        var archiveClient = new FakeArchiveClient([], throwOnFetch: true);
        var service = new ChessComGamesService(store, archiveClient, timeProvider);

        await Assert.ThrowsAsync<ChessComDependencyException>(() =>
            service.GetGamesPageAsync("test_user", 1, 12, CancellationToken.None));

        Assert.Equal(1, archiveClient.CallCount);
    }
}

public sealed class TableGameIndexStoreKeyTests
{
    [Fact]
    public void BuildPartitionKey_UsesLockedFormat()
    {
        var partitionKey = TableGameIndexStore.BuildPartitionKey("magnus");

        Assert.Equal("player%23magnus", partitionKey);
    }

    [Fact]
    public void BuildRowKey_UsesReverseTicksAndGameId()
    {
        var playedAtUtc = new DateTimeOffset(2026, 2, 20, 8, 30, 0, TimeSpan.Zero);

        var rowKey = TableGameIndexStore.BuildRowKey(playedAtUtc, "12345");

        Assert.StartsWith("game%23", rowKey);
        Assert.EndsWith("%2312345", rowKey);
    }
}

internal sealed class FakeGameIndexStore(IReadOnlyList<ChessGameSummary> initialGames) : IGameIndexStore
{
    private IReadOnlyList<ChessGameSummary> games = initialGames;

    public int UpsertCount { get; private set; }

    public string LastUpsertUsername { get; private set; } = string.Empty;

    public Task<IReadOnlyList<ChessGameSummary>> GetPlayerGamesAsync(string normalizedUsername, CancellationToken cancellationToken)
    {
        return Task.FromResult(games);
    }

    public Task UpsertPlayerGamesAsync(
        string normalizedUsername,
        IReadOnlyList<ChessGameSummary> newGames,
        DateTimeOffset ingestedAtUtc,
        CancellationToken cancellationToken)
    {
        UpsertCount++;
        LastUpsertUsername = normalizedUsername;
        games = newGames
            .Select(game => game with { IngestedAtUtc = ingestedAtUtc })
            .ToArray();
        return Task.CompletedTask;
    }
}

internal sealed class FakeArchiveClient(IReadOnlyList<ChessGameSummary> games, bool throwOnFetch = false) : IChessComArchiveClient
{
    public int CallCount { get; private set; }

    public Task<IReadOnlyList<ChessGameSummary>> FetchRecentGamesAsync(string normalizedUsername, int maxGames, CancellationToken cancellationToken)
    {
        CallCount++;
        if (throwOnFetch)
        {
            throw new HttpRequestException("Upstream error");
        }

        return Task.FromResult((IReadOnlyList<ChessGameSummary>)games.Take(maxGames).ToArray());
    }
}

internal sealed class StubTimeProvider(DateTimeOffset utcNow) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => utcNow;
}

internal static class ChessGameSummaryFactory
{
    public static IReadOnlyList<ChessGameSummary> BuildGames(int count, DateTimeOffset newestPlayedAtUtc, DateTimeOffset ingestedAtUtc)
    {
        var games = new List<ChessGameSummary>(count);

        for (var index = 0; index < count; index++)
        {
            games.Add(new ChessGameSummary(
                $"game-{index}",
                newestPlayedAtUtc.AddMinutes(-index),
                $"opponent-{index}",
                "win",
                "C20",
                "600",
                $"https://www.chess.com/game/live/{index}",
                "1. e4 e5 2. Nf3 Nc6",
                null,
                ingestedAtUtc));
        }

        return games;
    }
}
