using System.Text.RegularExpressions;
using ChessMate.Application.Validation;
using ChessMate.Functions.Contracts;
using ChessMate.Functions.Security;

namespace ChessMate.Functions.Validation;

public static partial class RequestValidators
{
    private const int LockedPageSize = 12;
    private static readonly HashSet<string> AllowedClassifications = new(StringComparer.OrdinalIgnoreCase)
    {
        "Brilliant",
        "Great",
        "Best",
        "Excellent",
        "Good",
        "Inaccuracy",
        "Mistake",
        "Miss",
        "Blunder",
        "Book"
    };

    private static readonly HashSet<string> AllowedAnalysisModes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Quick",
        "Deep"
    };

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

    public static void ValidatePayloadSize(int payloadBytes)
    {
        Guard.AgainstFalse(
            payloadBytes <= ApiSecurityOptions.MaxBatchCoachRequestBytes,
            "body",
            $"body must be at most {ApiSecurityOptions.MaxBatchCoachRequestBytes} bytes.");
    }

    public static void ValidateBatchCoachEnvelope(BatchCoachRequestEnvelope request)
    {
        Guard.AgainstNullOrWhiteSpace(request.GameId, nameof(request.GameId));

        if (request.Moves is null)
        {
            throw new RequestValidationException(
                "Validation failed.",
                new Dictionary<string, string[]>
                {
                    ["moves"] = ["moves is required."]
                });
        }

        Guard.AgainstFalse(
            request.Moves.Count <= ApiSecurityOptions.MaxBatchCoachMoves,
            "moves",
            $"moves must contain at most {ApiSecurityOptions.MaxBatchCoachMoves} items.");

        if (!string.IsNullOrWhiteSpace(request.AnalysisMode))
        {
            Guard.AgainstFalse(
                AllowedAnalysisModes.Contains(request.AnalysisMode),
                nameof(request.AnalysisMode),
                "analysisMode must be one of: Quick, Deep.");
        }

        for (var index = 0; index < request.Moves.Count; index++)
        {
            var move = request.Moves[index];

            Guard.AgainstFalse(
                AllowedClassifications.Contains(move.Classification),
                $"moves[{index}].classification",
                "classification is invalid.");
        }
    }

    public static void ValidateIdempotencyKey(string? idempotencyKey)
    {
        Guard.AgainstNullOrWhiteSpace(idempotencyKey, "idempotencyKey");
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