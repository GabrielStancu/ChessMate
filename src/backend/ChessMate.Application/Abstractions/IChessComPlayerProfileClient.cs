using ChessMate.Application.ChessCom;

namespace ChessMate.Application.Abstractions;

public interface IChessComPlayerProfileClient
{
    Task<PlayerProfile?> GetPlayerProfileAsync(string normalizedUsername, CancellationToken cancellationToken);
}
