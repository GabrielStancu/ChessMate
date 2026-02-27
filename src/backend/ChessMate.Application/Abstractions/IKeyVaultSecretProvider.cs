namespace ChessMate.Application.Abstractions;

/// <summary>
/// Resolves named secrets from a secure vault.
/// </summary>
public interface IKeyVaultSecretProvider
{
    /// <summary>
    /// Retrieves a secret value by name.
    /// </summary>
    /// <param name="secretName">The name of the secret in the vault.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The secret value.</returns>
    Task<string> GetSecretAsync(string secretName, CancellationToken cancellationToken = default);
}
