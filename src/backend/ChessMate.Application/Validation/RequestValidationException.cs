namespace ChessMate.Application.Validation;

public sealed class RequestValidationException : Exception
{
    public RequestValidationException(string message, IReadOnlyDictionary<string, string[]> errors)
        : base(message)
    {
        Errors = errors;
    }

    public IReadOnlyDictionary<string, string[]> Errors { get; }
}