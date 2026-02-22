using Microsoft.Azure.Functions.Worker.Http;

namespace ChessMate.Functions.Security;

public sealed class CorsPolicy
{
    private readonly HashSet<string> _allowedOrigins;

    public CorsPolicy(ApiSecurityOptions options)
    {
        _allowedOrigins = options.CorsAllowedOrigins
            .Select(NormalizeOrigin)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public bool IsOriginAllowed(HttpRequestData request)
    {
        if (!TryReadOriginHeader(request, out var requestOriginRaw))
        {
            return true;
        }

        if (!TryNormalizeOrigin(requestOriginRaw, out var requestOrigin))
        {
            return false;
        }

        return _allowedOrigins.Contains(requestOrigin);
    }

    public bool TryGetAllowedOrigin(HttpRequestData request, out string? allowedOrigin)
    {
        if (!TryReadOriginHeader(request, out var requestOriginRaw))
        {
            allowedOrigin = null;
            return false;
        }

        if (!TryNormalizeOrigin(requestOriginRaw, out var requestOrigin))
        {
            allowedOrigin = null;
            return false;
        }

        if (_allowedOrigins.Contains(requestOrigin))
        {
            allowedOrigin = requestOrigin;
            return true;
        }

        allowedOrigin = null;
        return false;
    }

    public static string[] ParseAndValidateAllowedOrigins(string? originsCsv)
    {
        if (string.IsNullOrWhiteSpace(originsCsv))
        {
            throw new InvalidOperationException(
                $"{ApiSecurityOptions.CorsAllowedOriginsEnvironmentVariable} is required and must contain at least one origin.");
        }

        var origins = originsCsv
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(NormalizeOrigin)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (origins.Length == 0)
        {
            throw new InvalidOperationException(
                $"{ApiSecurityOptions.CorsAllowedOriginsEnvironmentVariable} must contain at least one valid origin.");
        }

        return origins;
    }

    private static bool TryReadOriginHeader(HttpRequestData request, out string origin)
    {
        origin = string.Empty;

        if (!request.Headers.TryGetValues("Origin", out var originValues))
        {
            return false;
        }

        var value = originValues.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        origin = value;
        return true;
    }

    private static bool TryNormalizeOrigin(string origin, out string normalizedOrigin)
    {
        try
        {
            normalizedOrigin = NormalizeOrigin(origin);
            return true;
        }
        catch (InvalidOperationException)
        {
            normalizedOrigin = string.Empty;
            return false;
        }
    }

    private static string NormalizeOrigin(string origin)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        {
            throw new InvalidOperationException($"Invalid CORS origin '{origin}'.");
        }

        if (!string.Equals(uri.Scheme, "https", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(uri.Scheme, "http", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"CORS origin '{origin}' must use http or https scheme.");
        }

        var scheme = uri.Scheme.ToLowerInvariant();
        var host = uri.Host.ToLowerInvariant();
        var includePort = !uri.IsDefaultPort;

        return includePort
            ? $"{scheme}://{host}:{uri.Port}"
            : $"{scheme}://{host}";
    }
}
