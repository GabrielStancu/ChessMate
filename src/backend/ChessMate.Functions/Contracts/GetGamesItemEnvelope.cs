namespace ChessMate.Functions.Contracts;

public sealed record GetGamesItemEnvelope(
    string GameId,
    DateTimeOffset PlayedAtUtc,
    string Opponent,
    string Result,
    string Opening,
    string TimeControl,
    string Url);