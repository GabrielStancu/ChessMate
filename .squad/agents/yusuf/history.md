# Yusuf — History

## Core Context

**Project:** ChessMate — Modern Chess Analyzer
**Role:** Backend Dev — .NET 9, Azure Functions, Durable Functions, C#
**User:** (not configured)

## Project Knowledge

### Backend Solution Structure
- Solution: `src/backend/ChessMate.Backend.sln`
- Projects:
  - `ChessMate.Domain` — entity types, value objects, no framework dependencies
  - `ChessMate.Application` — use case abstractions, interfaces, contracts
  - `ChessMate.Infrastructure` — adapters: Chess.com HTTP, Table Storage
  - `ChessMate.Functions` — Azure Functions triggers, DI wiring, middleware, HTTP contracts
  - `ChessMate.Functions.Tests` — xUnit test project

### Key Abstractions (Application Layer)
- `IChessComGamesService` — Chess.com game fetch + normalization + cache
- `IChessComPlayerProfileClient` — low-level Chess.com HTTP client
- `ICorrelationContextAccessor` — correlation ID propagation
- `IKeyVaultSecretProvider` — secret access (no inline secrets)

### Infrastructure Layout
- `ChessMate.Infrastructure/ChessCom/` — Chess.com proxy adapter
- `ChessMate.Infrastructure/Configuration/` — config binding (BackendOptions, PersistencePolicy)
- `ChessMate.Infrastructure/Correlation/` — correlation ID middleware

### Azure Functions Layout
- `ChessMate.Functions/Functions/` — HTTP trigger functions (ChessComFunctions, RetentionCleanupFunctions)
- `ChessMate.Functions/Contracts/` — request/response DTOs (ErrorResponseEnvelope, GetGames contracts)
- `ChessMate.Functions/Middleware/` — middleware pipeline
- `ChessMate.Functions/Security/` — CORS, API security options
- `ChessMate.Functions/Validation/` — request validation
- `ChessMate.Functions/Http/` — HttpResponseFactory

### Locked Table Storage Keys
- `GameIndex`: PK = `player#{normalizedUsername}`, RK = `game#{reverseTicks}#{chessComGameId}`

### Failure Codes (HttpResponseFactory)
`ValidationError`, `UpstreamUnavailable` — inline string constants after batch-coach removal

## Learnings

### 2026-03-15: Removed entire backend LLM/batch-coach pipeline
- Deleted `ChessMate.Functions/BatchCoach/` (4 files: idempotency, response mapper, classification policy, failure codes)
- Deleted `ChessMate.Infrastructure/BatchCoach/` (22 files: Azure OpenAI client, prompt composer, response validator, tactical annotator, attack calculator, board types, FEN describer, UCI move describer, hash provider, operation state store, analysis batch store)
- Deleted `BatchCoachContracts.cs`, `BatchCoachDurableFunctions.cs`, `AnalysisFunctions.cs` (all 3 endpoints were batch-coach)
- Deleted `KeyVaultPostConfigureOptions.cs` (only resolved Azure OpenAI API key)
- Removed `AzureOpenAiOptions` and `AzureOpenAiRetryOptions` from `BackendOptions.cs`
- Removed Durable Functions NuGet package (`Microsoft.Azure.Functions.Worker.Extensions.DurableTask`)
- Cleaned `Program.cs`: removed IOperationStateStore, IAnalysisBatchStore, IRequestHashProvider, BatchCoachIdempotencyService, ICoachMoveGenerator registrations
- Cleaned `HttpResponseFactory.cs`: replaced `BatchCoachFailureCodes.*` with inline string constants
- Cleaned `RequestValidators.cs`: removed batch-coach validators and related HashSets
- Cleaned `ApiSecurityOptions.cs`: removed `MaxBatchCoachRequestBytes`, `MaxBatchCoachMoves`
- Cleaned `RetentionCleanupFunctions.cs`: removed "AnalysisBatch" and "OperationState" from TargetTables, kept "GameIndex" only
- Deleted test files: Tkt006, IdempotencyTests, Tkt018; cleaned Tkt008 (kept PersistencePolicy tests), Tkt014 (kept correlation tests), UnitTest1 (kept validator + GetGamesMapper tests)
- Decision: `GetAnalysisCacheAsync` endpoint removed — it depended entirely on batch-coach infrastructure (IAnalysisBatchStore, BatchCoachResponseEnvelope). No producer means no cache data.
- 24 tests remain, all pass. Solution builds clean.
