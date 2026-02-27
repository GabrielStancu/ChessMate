using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using ChessMate.Application.Abstractions;
using Microsoft.Extensions.Logging;

namespace ChessMate.Infrastructure.Configuration;

/// <summary>
/// Resolves secrets from Azure Key Vault using <see cref="SecretClient"/>
/// with <see cref="DefaultAzureCredential"/> (managed identity in Azure,
/// Azure CLI / VS credential locally).
/// </summary>
public sealed class KeyVaultSecretProvider : IKeyVaultSecretProvider
{
    private readonly SecretClient _secretClient;
    private readonly ILogger<KeyVaultSecretProvider> _logger;

    public KeyVaultSecretProvider(SecretClient secretClient, ILogger<KeyVaultSecretProvider> logger)
    {
        _secretClient = secretClient ?? throw new ArgumentNullException(nameof(secretClient));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<string> GetSecretAsync(string secretName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(secretName))
        {
            throw new ArgumentException("Secret name must not be empty.", nameof(secretName));
        }

        _logger.LogInformation("Resolving secret '{SecretName}' from Key Vault.", secretName);

        var response = await _secretClient.GetSecretAsync(secretName, cancellationToken: cancellationToken);

        _logger.LogInformation("Secret '{SecretName}' resolved successfully.", secretName);

        return response.Value.Value;
    }
}
