using ChessMate.Application.ChessCom;

namespace ChessMate.Infrastructure.ChessCom;

public interface IChessComArchiveClient
{
    Task<IReadOnlyList<ChessGameSummary>> FetchRecentGamesAsync(string normalizedUsername, int maxGames, CancellationToken cancellationToken);
}