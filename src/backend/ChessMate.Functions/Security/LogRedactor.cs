namespace ChessMate.Functions.Security;

public static class LogRedactor
{
    public static string RedactIdempotencyKey(string? idempotencyKey)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            return "missing";
        }

        var trimmed = idempotencyKey.Trim();
        if (trimmed.Length <= 8)
        {
            return "********";
        }

        var prefix = trimmed[..4];
        var suffix = trimmed[^4..];
        return $"{prefix}...{suffix}";
    }
}
