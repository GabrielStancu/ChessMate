# Deployment Baseline — ChessMate MVP

This document defines the deployment-ready configuration baseline for the ChessMate MVP. It covers the Angular SPA on Azure Static Web Apps, the backend Azure Functions with managed identity + Key Vault integration, environment variable contracts, and a post-deploy smoke test checklist.

---

## 1. Locked Architecture Decisions

| Decision | Value | Notes |
|---|---|---|
| Compute | Azure Functions (Consumption) + Durable Functions | Serverless-first; reevaluate Premium if p95 SLO misses |
| Storage | Azure Table Storage | Tables: `GameIndex`, `AnalysisBatch`, `OperationState` |
| AI | Azure OpenAI GPT-4o via Azure AI Foundry | Coaching generation for Mistake/Miss/Blunder moves |
| Frontend hosting | Azure Static Web Apps | Angular 18 SPA with managed API integration |
| Auth (MVP) | Anonymous endpoints + rate limiting + WAF | Roadmap to Entra auth |
| Cache policy | Chess.com read-through cache, 15-min TTL | Via `GameIndex` table |
| Region | Single Azure region | Switzerland North for MVP |
| Retention | 30-day TTL | `expiresAtUtc` on all persisted entities |

### Excluded from MVP Baseline

| Service | Reason |
|---|---|
| Azure Service Bus | Durable Functions orchestration is sufficient for fan-out/fan-in coaching |
| Azure Cosmos DB | Azure Table Storage meets cost and access-pattern requirements |
| Azure API Management | Rate limiting handled via WAF/edge policies + telemetry hooks |

---

## 2. Azure Functions — Environment Variable Contract

### Required App Settings

| Variable | Description | Example Value |
|---|---|---|
| `AzureWebJobsStorage` | Azure Storage connection for Functions runtime | `DefaultEndpointsProtocol=https;AccountName=...` |
| `FUNCTIONS_WORKER_RUNTIME` | Worker runtime identifier | `dotnet-isolated` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Application Insights connection string | `InstrumentationKey=...;IngestionEndpoint=...` |
| `CHESSMATE_CORS_ALLOWED_ORIGINS` | Comma-separated allowed CORS origins (required, fail-fast) | `https://your-swa-name.azurestaticapps.net` |
| `ChessMate__KeyVault__VaultUri` | Azure Key Vault URI for secret resolution | `https://kv-chessmate-swn-001.vault.azure.net/` |
| `ChessMate__Storage__TableServiceUri` | Azure Table Storage service URI | `https://sachessmateswn01.table.core.windows.net/` |
| `ChessMate__ChessCom__BaseUrl` | Chess.com public API base URL | `https://api.chess.com/pub` |
| `ChessMate__AzureOpenAi__Endpoint` | Azure OpenAI service endpoint | `https://foundry-chessmate-swn-001.cognitiveservices.azure.com/` |
| `ChessMate__AzureOpenAi__DeploymentName` | Azure OpenAI deployment name | `chess-analyzer` |
| `ChessMate__AzureOpenAi__ApiVersion` | Azure OpenAI API version | `2024-10-21` |
| `ChessMate__AzureOpenAi__ModelName` | Model name for telemetry | `gpt-4o` |
| `ChessMate__AzureOpenAi__MaxOutputTokens` | Max tokens per coaching response | `450` |
| `ChessMate__AzureOpenAi__Temperature` | LLM temperature | `0.2` |
| `ChessMate__AzureOpenAi__Retry__MaxAttempts` | Max retry attempts for transient AI failures | `3` |
| `ChessMate__AzureOpenAi__Retry__BaseDelayMilliseconds` | Retry base delay | `300` |
| `ChessMate__AzureOpenAi__Retry__MaxDelayMilliseconds` | Retry max delay | `2000` |
| `ChessMate__Telemetry__EnableAdaptiveSampling` | Enable/disable adaptive sampling | `true` |

### Optional / Secret-Resolved App Settings

| Variable | Description | Resolution |
|---|---|---|
| `ChessMate__AzureOpenAi__ApiKey` | Azure OpenAI API key | Resolved from Key Vault secret `AzureOpenAiApiKey` at startup if not present in config. When present in config, Key Vault resolution is skipped. |

### Key Vault Secret Names

| Secret Name | Description |
|---|---|
| `AzureOpenAiApiKey` | API key for Azure OpenAI GPT-4o deployment |

> **Note:** Additional secrets can be resolved by injecting `IKeyVaultSecretProvider` and calling `GetSecretAsync(secretName)`.

---

## 3. Azure Static Web Apps — Configuration

### Build Configuration

| Setting | Value |
|---|---|
| `app_location` | `src/frontend/chessmate-frontend` |
| `output_location` | `dist/chessmate-frontend` |
| `api_location` | _(leave empty — managed Functions backend is linked separately)_ |

### Environment Configuration

| File | `apiBaseUrl` | Notes |
|---|---|---|
| `environment.ts` (production) | `/api` | SWA proxies `/api/*` to linked Functions backend |
| `environment.development.ts` | `http://localhost:7071/api` | Local dev against Functions emulator |

### SWA Config (`staticwebapp.config.json`)

The `staticwebapp.config.json` in the frontend build output provides:
- **Navigation fallback** to `/index.html` for SPA client-side routing (required for deep links like `/analysis/:gameId`).
- **Route rules** allowing anonymous access to `/api/*`.
- **Security response headers:** `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`.
- **Platform runtime:** `dotnet-isolated:9.0`.

---

## 4. Managed Identity Access Requirements

The Azure Functions app must have a **system-assigned managed identity** enabled. The following RBAC role assignments are required:

| Azure Resource | Required Role | Purpose |
|---|---|---|
| Azure Table Storage account | `Storage Table Data Contributor` | Read/write `GameIndex`, `OperationState`, `AnalysisBatch` tables |
| Azure Key Vault | `Key Vault Secrets User` | Read secrets (`AzureOpenAiApiKey`, future secrets) |
| Azure OpenAI (Cognitive Services) | `Cognitive Services OpenAI User` | Invoke GPT-4o coaching prompts (fallback when no API key) |

### Identity Flow

```
Azure Functions (System MI)
  ├── DefaultAzureCredential → Table Storage (RBAC)
  ├── DefaultAzureCredential → Key Vault SecretClient (RBAC)
  └── DefaultAzureCredential → Azure OpenAI bearer token (RBAC, fallback)
```

For **local development**, `DefaultAzureCredential` uses the developer's Azure CLI or Visual Studio credential. Ensure you are logged in:
```bash
az login
```

---

## 5. Durable Functions Configuration

| Setting | Value | Notes |
|---|---|---|
| Hub name | `ChessMateHub` | Configured in `host.json` |
| Storage | Same `AzureWebJobsStorage` account | Durable task hub uses queues + tables in this account |

---

## 6. Application Insights / Observability

| Setting | Notes |
|---|---|
| Connection string | Set via `APPLICATIONINSIGHTS_CONNECTION_STRING` |
| Adaptive sampling | Controlled via `ChessMate__Telemetry__EnableAdaptiveSampling` |
| Correlation | `correlationId` and `operationId` propagated across HTTP, Durable, activities, and LLM calls |
| Request sampling exclusion | Requests excluded from sampling in `host.json` |

---

## 7. Post-Deploy Smoke Test Checklist

After deploying the SWA + Functions backend, verify the following:

### Static Web App

- [ ] **Root URL** — `https://<swa-name>.azurestaticapps.net/` loads the Angular SPA (search page).
- [ ] **Deep link** — `https://<swa-name>.azurestaticapps.net/analysis/test` falls back to the SPA (does not return 404).
- [ ] **Security headers** — Response includes `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] **Static assets** — `/assets/stockfish/stockfish-18-single.wasm` and `/assets/cm-chessboard/` load successfully.

### API Contracts

- [ ] **GET games** — `GET /api/chesscom/users/{valid-username}/games?page=1&pageSize=12` returns `200` with response envelope containing `items`, `page`, `pageSize`, `hasMore`, `sourceTimestamp`, `cacheStatus`, `cacheTtlMinutes`, `schemaVersion`.
- [ ] **GET games validation** — `GET /api/chesscom/users//games?page=1&pageSize=12` (empty username) returns `400`.
- [ ] **Batch-coach missing key** — `POST /api/analysis/batch-coach` without `Idempotency-Key` header returns `400`.
- [ ] **CORS enforcement** — Request from non-allowlisted origin is rejected.

### Infrastructure

- [ ] **Application Insights** — Request telemetry appears in Application Insights within 5 minutes of smoke test calls.
- [ ] **Key Vault** — Function app startup logs show `AzureOpenAI API key resolved from Key Vault successfully` (no plaintext secret in logs).
- [ ] **Table Storage** — Tables `GameIndex`, `OperationState`, `AnalysisBatch` are accessible (created on first write).
- [ ] **Managed identity** — No connection string secrets in app settings for Table Storage, Key Vault, or OpenAI; all use managed identity.

---

## 8. Deployment Steps (Manual)

### Prerequisites
- Azure CLI installed and logged in (`az login`)
- .NET 9 SDK installed
- Node.js 18+ and npm installed
- Azure Static Web Apps CLI (`npm install -g @azure/static-web-apps-cli`) for local testing

### Backend (Azure Functions)

1. **Build:**
   ```bash
   cd src/backend
   dotnet publish ChessMate.Functions/ChessMate.Functions.csproj -c Release -o ./publish
   ```

2. **Deploy:**
   ```bash
   # Using Azure Functions Core Tools
   cd publish
   func azure functionapp publish <function-app-name>
   ```

3. **Configure app settings** — apply all variables from Section 2 in the Azure Portal or via CLI:
   ```bash
   az functionapp config appsettings set \
     --name <function-app-name> \
     --resource-group <rg-name> \
     --settings "ChessMate__KeyVault__VaultUri=https://<kv-name>.vault.azure.net/" \
                "ChessMate__Storage__TableServiceUri=https://<storage-name>.table.core.windows.net/" \
                "CHESSMATE_CORS_ALLOWED_ORIGINS=https://<swa-name>.azurestaticapps.net"
   ```

4. **Assign managed identity roles** — see Section 4.

### Frontend (Azure Static Web Apps)

1. **Build:**
   ```bash
   cd src/frontend/chessmate-frontend
   npm ci
   ng build --configuration production
   ```

2. **Deploy** — via Azure Portal (create SWA resource, link to repo) or SWA CLI:
   ```bash
   swa deploy dist/chessmate-frontend --env production
   ```

3. **Link backend** — in the Azure Portal, link the SWA to the Azure Functions app under the "APIs" blade.

### Local Development (SWA CLI Emulation)

```bash
# Terminal 1: Start Functions backend
cd src/backend/ChessMate.Functions
func start

# Terminal 2: Start Angular dev server
cd src/frontend/chessmate-frontend
ng serve

# Terminal 3 (optional): SWA CLI proxy for full SWA emulation
swa start http://localhost:4200 --api-location http://localhost:7071
```
