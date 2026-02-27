using Azure.Security.KeyVault.Secrets;
using ChessMate.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ChessMate.Functions.Security;

/// <summary>
/// Post-configures <see cref="BackendOptions"/> by resolving secrets
/// from Azure Key Vault at first access (app startup).
/// </summary>
public sealed class KeyVaultPostConfigureOptions : IPostConfigureOptions<BackendOptions>
{
    private readonly SecretClient _secretClient;
    private readonly ILogger<KeyVaultPostConfigureOptions> _logger;

    public KeyVaultPostConfigureOptions(SecretClient secretClient, ILogger<KeyVaultPostConfigureOptions> logger)
    {
        _secretClient = secretClient ?? throw new ArgumentNullException(nameof(secretClient));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public void PostConfigure(string? name, BackendOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.AzureOpenAi.ApiKey))
        {
            _logger.LogInformation("AzureOpenAI API key found in configuration; Key Vault resolution skipped.");
            return;
        }

        _logger.LogInformation("Resolving AzureOpenAI API key from Key Vault at startup.");

        var secret = _secretClient.GetSecret("AzureOpenAiApiKey");
        options.AzureOpenAi.ApiKey = secret.Value.Value;

        _logger.LogInformation("AzureOpenAI API key resolved from Key Vault successfully.");
    }
}
