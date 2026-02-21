namespace ChessMate.Infrastructure.Configuration;

public sealed class BackendOptions
{
    public const string SectionName = "ChessMate";

    public KeyVaultOptions KeyVault { get; init; } = new();

    public ChessComOptions ChessCom { get; init; } = new();

    public StorageOptions Storage { get; init; } = new();

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

public sealed class TelemetryOptions
{
    public bool EnableAdaptiveSampling { get; init; }
}