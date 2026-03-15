namespace ChessMate.Functions.Security;

public sealed class ApiSecurityOptions
{
    public const string CorsAllowedOriginsEnvironmentVariable = "CHESSMATE_CORS_ALLOWED_ORIGINS";

    public required string[] CorsAllowedOrigins { get; init; }
}
