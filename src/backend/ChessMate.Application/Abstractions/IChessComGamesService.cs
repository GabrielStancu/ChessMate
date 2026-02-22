using ChessMate.Application.ChessCom;

namespace ChessMate.Application.Abstractions;

public interface IChessComGamesService
{
    Task<GetGamesPageResult> GetGamesPageAsync(string username, int page, int pageSize, CancellationToken cancellationToken);
}