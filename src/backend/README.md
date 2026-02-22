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
