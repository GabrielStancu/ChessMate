using System.Text.RegularExpressions;
using ChessMate.Application.Validation;

namespace ChessMate.Functions.Validation;

public static partial class RequestValidators
{
    private const int LockedPageSize = 12;

    [GeneratedRegex("^[a-zA-Z0-9_-]{3,30}$", RegexOptions.CultureInvariant)]
    private static partial Regex UsernameRegex();

    public static void ValidateGetGamesRequest(string username, int page, int pageSize)
    {
        Guard.AgainstNullOrWhiteSpace(username, nameof(username));
        Guard.AgainstFalse(UsernameRegex().IsMatch(username), nameof(username), "username format is invalid.");
        Guard.AgainstFalse(page >= 1, nameof(page), "page must be greater than or equal to 1.");
        Guard.AgainstFalse(pageSize == LockedPageSize, nameof(pageSize), "pageSize must be exactly 12.");
    }

    public static int ParseOptionalIntegerQuery(string? value, string fieldName, int fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        return int.TryParse(value, out var parsedValue)
            ? parsedValue
            : throw CreateInvalidIntegerException(fieldName);
    }

    public static void ValidateBatchCoachRequest(string payload)
    {
        Guard.AgainstNullOrWhiteSpace(payload, "body");
    }

    private static RequestValidationException CreateInvalidIntegerException(string fieldName)
    {
        var errors = new Dictionary<string, string[]>
        {
            [fieldName] = [$"{fieldName} must be a valid integer."]
        };

        return new RequestValidationException("Validation failed.", errors);
    }
}