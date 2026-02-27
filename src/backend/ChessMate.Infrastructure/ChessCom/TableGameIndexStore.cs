using Azure.Data.Tables;
using ChessMate.Application.ChessCom;
using ChessMate.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;

namespace ChessMate.Infrastructure.ChessCom;

public sealed class TableGameIndexStore : IGameIndexStore
{
    private readonly TableClient _tableClient;
    private readonly ILogger<TableGameIndexStore> _logger;

    private const string GamePrefix = "game%23";

    public TableGameIndexStore(TableClient tableClient, ILogger<TableGameIndexStore> logger)
    {
        _tableClient = tableClient;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ChessGameSummary>> GetPlayerGamesAsync(string normalizedUsername, CancellationToken cancellationToken)
    {
        var partitionKey = BuildPartitionKey(normalizedUsername);
        var entities = new List<GameIndexEntity>();

        await foreach (var entity in _tableClient.QueryAsync<GameIndexEntity>(
                           entity => entity.PartitionKey == partitionKey,
                           cancellationToken: cancellationToken))
        {
            entities.Add(entity);
        }

        return entities
            .OrderBy(entity => entity.RowKey, StringComparer.Ordinal)
            .Select(MapToSummary)
            .ToArray();
    }

    public async Task UpsertPlayerGamesAsync(
        string normalizedUsername,
        IReadOnlyList<ChessGameSummary> games,
        DateTimeOffset ingestedAtUtc,
        CancellationToken cancellationToken)
    {
        if (games.Count == 0)
        {
            return;
        }

        await _tableClient.CreateIfNotExistsAsync(cancellationToken);

        var partitionKey = BuildPartitionKey(normalizedUsername);

        _logger.LogInformation(
            "Upserting {GameCount} games for username {Username}.",
            games.Count,
            normalizedUsername);

        foreach (var game in games)
        {
            var entity = new GameIndexEntity
            {
                PartitionKey = partitionKey,
                RowKey = BuildRowKey(game.PlayedAtUtc, game.GameId),
                GameId = game.GameId,
                PlayedAtUtc = game.PlayedAtUtc,
                Opponent = game.Opponent,
                Result = game.Result,
                Opening = game.Opening,
                TimeControl = game.TimeControl,
                Url = game.Url,
                Pgn = game.Pgn,
                InitialFen = game.InitialFen,
                IngestedAtUtc = ingestedAtUtc,
                ExpiresAtUtc = PersistencePolicy.CalculateExpiresAtUtc(ingestedAtUtc),
                SchemaVersion = PersistencePolicy.SchemaVersion
            };

            await _tableClient.UpsertEntityAsync(entity, TableUpdateMode.Replace, cancellationToken);
        }
    }

    public static string BuildPartitionKey(string normalizedUsername)
    {
        return $"player%23{EscapeTableKeyComponent(normalizedUsername)}";
    }

    public static string BuildRowKey(DateTimeOffset playedAtUtc, string chessComGameId)
    {
        var reverseTicks = long.MaxValue - playedAtUtc.UtcTicks;
        return $"{GamePrefix}{reverseTicks:D19}%23{EscapeTableKeyComponent(chessComGameId)}";
    }

    private static string EscapeTableKeyComponent(string value)
    {
        return Uri.EscapeDataString(value);
    }

    private static ChessGameSummary MapToSummary(GameIndexEntity entity)
    {
        return new ChessGameSummary(
            entity.GameId,
            entity.PlayedAtUtc,
            entity.Opponent,
            entity.Result,
            entity.Opening,
            entity.TimeControl,
            entity.Url,
            entity.Pgn,
            entity.InitialFen,
            entity.IngestedAtUtc);
    }
}