# Cobb — History

## Core Context

**Project:** ChessMate — Modern Chess Analyzer
**Role:** Lead — Architecture, scope decisions, code review
**User:** (not configured)

## Project Knowledge

### Architecture (Locked — system_design.md)
- **Compute:** Azure Functions (Consumption) + Durable Functions. No premium plan for MVP.
- **Storage:** Azure Table Storage — `GameIndex`, `AnalysisBatch`, `OperationState`.
- **AI:** Azure OpenAI GPT-4o via Azure AI Foundry.
- **Auth (MVP):** Anonymous endpoints + rate limiting. No Entra auth yet.
- **Cache:** Read-through cache on `GameIndex` with 15-minute TTL.
- **SLOs:** batch-coach p95 ≤ 12s (Quick), ≤ 30s (Deep).

### Locked API Contracts
- `GET /api/chesscom/users/{username}/games?page={n}&pageSize=12`
- `POST /api/analysis/batch-coach`

### Locked ADRs (ADR-001 through ADR-005)
- ADR-001: Consumption plan + Durable Functions
- ADR-002: Always inline payload (no blob pointer in MVP)
- ADR-003: Anonymous + rate limiting for MVP auth
- ADR-004: Read-through cache with 15-min TTL (Chess.com)
- ADR-005: Entity envelope versioning (`schemaVersion`), additive-only in v1

### Key File Paths
- `docs/prd/prd.md` — product source of truth
- `docs/architecture/system_design.md` — approved architecture
- `docs/backlog/tickets_to_import.md` — implementation ticket list (TKT-001 through TKT-022+)
- `src/backend/ChessMate.Backend.sln` — .NET solution
- `src/frontend/chessmate-frontend/` — Angular app

### Table Storage Keys
- `GameIndex`: PK = `player#{normalizedUsername}`, RK = `game#{reverseTicks}#{chessComGameId}`
- `AnalysisBatch`: PK = `game#{gameId}`, RK = `analysis#{analysisVersion}#{createdAtUtcTicks}`
- `OperationState`: PK = `op#{operationId}`, RK = `v1` (alt: PK = `req#{requestHashPrefix}`, RK = `op#{operationId}`)

## Learnings

*(Append new learnings below as work progresses)*
