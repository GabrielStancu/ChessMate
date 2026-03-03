namespace ChessMate.Functions.Contracts;

public sealed record GetGamesItemEnvelope(
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
    string? WhiteAvatarUrl = null,
    string? BlackAvatarUrl = null,
    string? WhiteCountry = null,
    string? BlackCountry = null);