# ChessMate Backend

## Security Checklist (TKT-009)

### Anonymous API baseline
- `POST /api/analysis/batch-coach` enforces request body limit: `512 KB`.
- `POST /api/analysis/batch-coach` enforces move count limit: max `120` moves.
- Batch-coach request validation enforces enum allowlists:
  - `analysisMode`: `Quick`, `Deep`
  - `classification`: `Brilliant`, `Great`, `Best`, `Excellent`, `Good`, `Inaccuracy`, `Mistake`, `Miss`, `Blunder`, `Book`

### CORS allowlist
- CORS allowlist is required at startup through env var `CHESSMATE_CORS_ALLOWED_ORIGINS`.
- Value format: comma-separated origins, for example:
  - `https://app.contoso.com,https://staging.contoso.com,http://localhost:4200`
- Startup fails fast when the variable is missing, empty, or contains invalid origins.

### Rate-limit integration hooks
- API responses emit hook headers for Azure edge policy integration:
  - `X-RateLimit-Hook: edge-policy`
  - `X-RateLimit-Policy: azure-edge`
- If edge headers are present on inbound requests (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`), they are propagated to the response.
- Telemetry event `api.ratelimit.hook` is emitted with method/path/status and header-presence dimensions.

### Log redaction and sensitive data handling
- Logs do not include raw LLM prompts, generated coaching text, or API secrets.
- Idempotency keys are redacted using masked form (for example: `abcd...wxyz`) before being logged.
- Keep all secrets in secure configuration sources (Key Vault / environment), never in logs.

## Key Vault Integration (TKT-015)

### Secret resolution
- `SecretClient` (`Azure.Security.KeyVault.Secrets`) is registered when `ChessMate__KeyVault__VaultUri` is configured.
- At startup, `KeyVaultPostConfigureOptions` resolves the `AzureOpenAiApiKey` secret from Key Vault and injects it into `BackendOptions.AzureOpenAi.ApiKey`.
- If `ApiKey` is already present in configuration, Key Vault resolution is skipped.
- `DefaultAzureCredential` is used for Key Vault access (managed identity in Azure, Azure CLI/VS credential locally).

### Generic secret provider
- `IKeyVaultSecretProvider` abstraction is available for resolving additional secrets on demand.
- Inject `IKeyVaultSecretProvider` and call `GetSecretAsync(secretName)` from any service.

### Required RBAC
- The Function App's managed identity requires the `Key Vault Secrets User` role on the target Key Vault.

### Key Vault secret names
| Secret | Description |
|---|---|
| `AzureOpenAiApiKey` | API key for Azure OpenAI GPT-4o deployment |

## Deployment (TKT-015)

Full deployment configuration, environment contracts, managed identity requirements, and smoke test checklist are documented in [`docs/deployment/deployment-baseline.md`](../../docs/deployment/deployment-baseline.md).
