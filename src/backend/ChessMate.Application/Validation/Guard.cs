namespace ChessMate.Application.Validation;

public static class Guard
{
    public static void AgainstNullOrWhiteSpace(string? value, string fieldName)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        throw CreateValidationException(fieldName, $"{fieldName} is required.");
    }

    public static void AgainstFalse(bool condition, string fieldName, string message)
    {
        if (condition)
        {
            return;
        }

        throw CreateValidationException(fieldName, message);
    }

    public static void AgainstOutOfRange(int value, string fieldName, int min, int max)
    {
        var inRange = value >= min && value <= max;
        if (inRange)
        {
            return;
        }

        var message = $"{fieldName} must be between {min} and {max}.";
        throw CreateValidationException(fieldName, message);
    }

    private static RequestValidationException CreateValidationException(string fieldName, string message)
    {
        var errors = new Dictionary<string, string[]>
        {
            [fieldName] = [message]
        };

        return new RequestValidationException("Validation failed.", errors);
    }
}