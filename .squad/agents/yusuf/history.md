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
  - `ChessMate.Infrastructure` — adapters: Chess.com HTTP, Table Storage, OpenAI
  - `ChessMate.Functions` — Azure Functions triggers, DI wiring, middleware, HTTP contracts
  - `ChessMate.Functions.Tests` — xUnit test project

### Key Abstractions (Application Layer)
- `IChessComGamesService` — Chess.com game fetch + normalization + cache
- `IChessComPlayerProfileClient` — low-level Chess.com HTTP client
- `ICorrelationContextAccessor` — correlation ID propagation
- `IKeyVaultSecretProvider` — secret access (no inline secrets)

### Infrastructure Layout
- `ChessMate.Infrastructure/ChessCom/` — Chess.com proxy adapter
- `ChessMate.Infrastructure/BatchCoach/` — coaching infrastructure
- `ChessMate.Infrastructure/Configuration/` — config binding
- `ChessMate.Infrastructure/Correlation/` — correlation ID middleware

### Azure Functions Layout
- `ChessMate.Functions/Functions/` — HTTP trigger functions
- `ChessMate.Functions/BatchCoach/` — Durable orchestration/activities
- `ChessMate.Functions/Contracts/` — request/response DTOs
- `ChessMate.Functions/Middleware/` — middleware pipeline
- `ChessMate.Functions/Security/` — CORS, rate limiting hooks
- `ChessMate.Functions/Validation/` — request validation

### Locked Table Storage Keys
- `GameIndex`: PK = `player#{normalizedUsername}`, RK = `game#{reverseTicks}#{chessComGameId}`
- `AnalysisBatch`: PK = `game#{gameId}`, RK = `analysis#{analysisVersion}#{createdAtUtcTicks}`
- `OperationState`: PK = `op#{operationId}`, RK = `v1`

### Coaching Prompt Rules
- Role-aware: user move → "You moved …", opponent move → "Opponent moved …"
- Output: why wrong + how opponent exploits it + suggested plan
- Post-generation: soften absolute claims, 1 regeneration max for contradictions

### Failure Taxonomy
`ValidationError`, `RateLimited`, `UpstreamUnavailable`, `Timeout`, `OrchestrationFailed`, `PartialCoaching`

## Learnings

*(Append new learnings below as work progresses)*
