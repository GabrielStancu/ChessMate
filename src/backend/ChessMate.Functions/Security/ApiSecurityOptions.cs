namespace ChessMate.Functions.Security;

public sealed class ApiSecurityOptions
{
    public const string CorsAllowedOriginsEnvironmentVariable = "CHESSMATE_CORS_ALLOWED_ORIGINS";

    public const int MaxBatchCoachRequestBytes = 512 * 1024;

    public const int MaxBatchCoachMoves = 120;

    public required string[] CorsAllowedOrigins { get; init; }
}
