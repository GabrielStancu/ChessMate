using System.Text.Json;
using System.Text.Json.Serialization;
using ChessMate.Application.ChessCom;

namespace ChessMate.Infrastructure.ChessCom;

public sealed class ChessComArchiveClient : IChessComArchiveClient
{
    private readonly HttpClient _httpClient;
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public ChessComArchiveClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyList<ChessGameSummary>> FetchRecentGamesAsync(string normalizedUsername, int maxGames, CancellationToken cancellationToken)
    {
        if (maxGames <= 0)
        {
            return new List<ChessGameSummary>();
        }

        var archiveIndex = await GetFromJsonAsync<ArchiveIndexResponse>($"player/{normalizedUsername}/games/archives", cancellationToken);
        var archiveUrls = archiveIndex.Archives ?? new string[] {};
        if (archiveUrls.Length == 0)
        {
            return new List<ChessGameSummary>();
        }

        var recentGames = new List<ChessGameSummary>(capacity: maxGames);

        foreach (var archiveUrl in archiveUrls.Reverse())
        {
            var archivePath = BuildRelativePath(archiveUrl);
            var archive = await GetFromJsonAsync<GamesArchiveResponse>(archivePath, cancellationToken);

            foreach (var game in archive.Games ?? new ChessComGame[] {})
            {
                var normalized = NormalizeGame(game, normalizedUsername);
                if (normalized is null)
                {
                    continue;
                }

                recentGames.Add(normalized);
            }

            if (recentGames.Count >= maxGames)
            {
                break;
            }
        }

        return recentGames
            .OrderByDescending(game => game.PlayedAtUtc)
            .ThenBy(game => game.GameId, StringComparer.Ordinal)
            .Take(maxGames)
            .ToArray();
    }

    private async Task<TResponse> GetFromJsonAsync<TResponse>(string relativePath, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync(relativePath, cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var payload = await JsonSerializer.DeserializeAsync<TResponse>(responseStream, SerializerOptions, cancellationToken);
        if (payload is null)
        {
            throw new HttpRequestException("Chess.com API returned an empty payload.");
        }

        return payload;
    }

    private static string BuildRelativePath(string archiveUrl)
    {
        if (Uri.TryCreate(archiveUrl, UriKind.Absolute, out var uri))
        {
            var path = uri.PathAndQuery.TrimStart('/');
            if (path.StartsWith("pub/", StringComparison.OrdinalIgnoreCase))
            {
                return path[4..];
            }

            return path;
        }

        return archiveUrl.TrimStart('/');
    }

    private static ChessGameSummary? NormalizeGame(ChessComGame game, string normalizedUsername)
    {
        var whiteUsername = game.White?.Username?.Trim().ToLowerInvariant();
        var blackUsername = game.Black?.Username?.Trim().ToLowerInvariant();

        var isWhite = string.Equals(whiteUsername, normalizedUsername, StringComparison.Ordinal);
        var isBlack = string.Equals(blackUsername, normalizedUsername, StringComparison.Ordinal);

        if (!isWhite && !isBlack)
        {
            return null;
        }

        var userSide = isWhite ? game.White : game.Black;
        var opponentSide = isWhite ? game.Black : game.White;
        var playedAtUtc = game.EndTime > 0
            ? DateTimeOffset.FromUnixTimeSeconds(game.EndTime)
            : DateTimeOffset.UtcNow;

        return new ChessGameSummary(
            ExtractGameId(game.Url),
            playedAtUtc,
            opponentSide?.Username ?? "unknown",
            userSide?.Result ?? "unknown",
            game.Eco ?? string.Empty,
            game.TimeControl ?? string.Empty,
            game.Url ?? string.Empty,
            game.Pgn,
            game.InitialFen,
            DateTimeOffset.MinValue);
    }

    private static string ExtractGameId(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return Guid.NewGuid().ToString("N");
        }

        var candidate = url.TrimEnd('/').Split('/').LastOrDefault();
        return string.IsNullOrWhiteSpace(candidate) ? Guid.NewGuid().ToString("N") : candidate;
    }

    private sealed record ArchiveIndexResponse([property: JsonPropertyName("archives")] string[]? Archives);

    private sealed record GamesArchiveResponse([property: JsonPropertyName("games")] ChessComGame[]? Games);

    private sealed record ChessComGame(
        [property: JsonPropertyName("url")] string? Url,
        [property: JsonPropertyName("eco")] string? Eco,
        [property: JsonPropertyName("time_control")] string? TimeControl,
        [property: JsonPropertyName("pgn")] string? Pgn,
        [property: JsonPropertyName("fen")] string? InitialFen,
        [property: JsonPropertyName("end_time")] long EndTime,
        [property: JsonPropertyName("white")] ChessComPlayer? White,
        [property: JsonPropertyName("black")] ChessComPlayer? Black);

    private sealed record ChessComPlayer(
        [property: JsonPropertyName("username")] string? Username,
        [property: JsonPropertyName("result")] string? Result);
}