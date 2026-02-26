namespace ChessMate.Infrastructure.Configuration;

public sealed class BackendOptions
{
    public const string SectionName = "ChessMate";

    public KeyVaultOptions KeyVault { get; init; } = new();

    public ChessComOptions ChessCom { get; init; } = new();

    public StorageOptions Storage { get; init; } = new();

    public AzureOpenAiOptions AzureOpenAi { get; init; } = new();

    public TelemetryOptions Telemetry { get; init; } = new();
}

public sealed class KeyVaultOptions
{
    public string VaultUri { get; init; } = string.Empty;
}

public sealed class ChessComOptions
{
    public string BaseUrl { get; init; } = "https://api.chess.com/pub";
}

public sealed class StorageOptions
{
    public string TableServiceUri { get; init; } = string.Empty;
}

public sealed class AzureOpenAiOptions
{
    public string Endpoint { get; init; } = string.Empty;

    public string DeploymentName { get; init; } = string.Empty;

    public string ApiVersion { get; init; } = "2024-10-21";

    public string? ApiKey { get; init; }

    public string ModelName { get; init; } = "gpt-4o";

    public int MaxOutputTokens { get; init; } = 250;

    public decimal Temperature { get; init; } = 0.1m;

    public AzureOpenAiRetryOptions Retry { get; init; } = new();
}

public sealed class AzureOpenAiRetryOptions
{
    public int MaxAttempts { get; init; } = 3;

    public int BaseDelayMilliseconds { get; init; } = 300;

    public int MaxDelayMilliseconds { get; init; } = 2_000;
}

public sealed class TelemetryOptions
{
    public bool EnableAdaptiveSampling { get; init; }
}