namespace ChessMate.Application.ChessCom;

public sealed record ChessGameSummary(
    string GameId,
    DateTimeOffset PlayedAtUtc,
    string WhitePlayer,
    string BlackPlayer,
    int? WhiteRating,
    int? BlackRating,
    string PlayerColor,
    string Opponent,
    string Result,
    string Opening,
    string TimeControl,
    string Url,
    string? Pgn,
    string? InitialFen,
    DateTimeOffset IngestedAtUtc);

public sealed record GetGamesPageResult(
    IReadOnlyList<ChessGameSummary> Items,
    int Page,
    int PageSize,
    bool HasMore,
    DateTimeOffset SourceTimestamp,
    string CacheStatus,
    int CacheTtlMinutes);

public sealed class ChessComDependencyException(string message, Exception? innerException = null)
    : Exception(message, innerException);