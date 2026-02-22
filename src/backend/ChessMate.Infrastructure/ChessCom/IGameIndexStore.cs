using ChessMate.Application.ChessCom;

namespace ChessMate.Infrastructure.ChessCom;

public interface IGameIndexStore
{
    Task<IReadOnlyList<ChessGameSummary>> GetPlayerGamesAsync(string normalizedUsername, CancellationToken cancellationToken);

    Task UpsertPlayerGamesAsync(string normalizedUsername, IReadOnlyList<ChessGameSummary> games, DateTimeOffset ingestedAtUtc, CancellationToken cancellationToken);
}