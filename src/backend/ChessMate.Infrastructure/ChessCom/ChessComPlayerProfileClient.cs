using System.Text.Json;
using System.Text.Json.Serialization;
using ChessMate.Application.Abstractions;
using ChessMate.Application.ChessCom;

namespace ChessMate.Infrastructure.ChessCom;

public sealed class ChessComPlayerProfileClient : IChessComPlayerProfileClient
{
    private readonly HttpClient _httpClient;
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public ChessComPlayerProfileClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<PlayerProfile?> GetPlayerProfileAsync(string normalizedUsername, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.GetAsync($"player/{normalizedUsername}", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var payload = await JsonSerializer.DeserializeAsync<ChessComProfileResponse>(
                stream, SerializerOptions, cancellationToken);

            if (payload is null)
            {
                return null;
            }

            return new PlayerProfile(payload.Avatar, ExtractCountryCode(payload.Country));
        }
        catch
        {
            // Profile enrichment is best-effort; never fail the games request.
            return null;
        }
    }

    private static string? ExtractCountryCode(string? countryUrl)
    {
        if (string.IsNullOrWhiteSpace(countryUrl))
        {
            return null;
        }

        // e.g. https://api.chess.com/pub/country/US  →  "US"
        var segment = countryUrl.TrimEnd('/').Split('/').LastOrDefault();
        return string.IsNullOrWhiteSpace(segment) ? null : segment.ToUpperInvariant();
    }

    private sealed record ChessComProfileResponse(
        [property: JsonPropertyName("avatar")] string? Avatar,
        [property: JsonPropertyName("country")] string? Country);
}
