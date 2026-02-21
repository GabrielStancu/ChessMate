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

    public static void ValidateBatchCoachRequest(string payload)
    {
        Guard.AgainstNullOrWhiteSpace(payload, "body");
    }
}