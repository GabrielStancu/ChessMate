# Architecture Handoff Pack — Modern Chess Analyzer

## 1) What is finalized (from approved PRD)
- Product: minimalist chess analyzer with LLM coaching.
- MVP flow: Chess.com username search → select one game → local engine analysis → coaching review.
- Pagination: 12 games per page.
- Analysis modes: Quick / Deep, with user params (depth, threads, time per move).
- Coaching trigger: Mistake, Miss, Blunder.
- Response contract: analysis + coaching in a single payload.
- Retention: 30 days.
- Cloud baseline: Azure Functions + Durable Functions, Azure Table Storage, Azure OpenAI GPT-4o.
- UI style direction: thick dark outlines, rounded edges, minimalist facial features, flat vibrant colors, white border around the shape.

Source: [docs/prd/draft_prd.md](../prd/draft_prd.md)

## 2) Non-negotiable constraints
- Backend: .NET 9+ (C#), clean architecture and SOLID.
- Frontend web: Angular 18+ (Signals, standalone components).
- Mobile: .NET MAUI with shared business logic where practical.
- Serverless-first posture on Azure.
- Stockfish.js (WASM) must run locally in browser Web Worker(s).
- Backend proxies Chess.com API for CORS-safe ingestion.
- Secrets must be managed via Azure Key Vault.

## 3) Architecture goals for this phase
1. Define end-to-end component architecture and trust boundaries.
2. Define API contracts and idempotency strategy for batch coaching.
3. Define storage partitioning/key strategy in Azure Table Storage.
4. Define durability, retry, and timeout policies for orchestration.
5. Define observability baseline (logs, metrics, correlation IDs).

## 4) Candidate target architecture (recommended baseline)
### Client tier
- Angular SPA
  - Game search/list and pagination UI.
  - Board UI + overlays + classification markers.
  - Local Stockfish.js worker orchestration.
  - Sends classification payload for coaching.
- MAUI app (phase-aligned/mobile parity)
  - Reuses shared domain logic DTOs/services where possible.

### API/compute tier
- Azure Functions (.NET isolated worker)
  - `GET /api/chesscom/users/{username}/games`
  - `POST /api/analysis/batch-coach`
- Durable Functions orchestration
  - Validate request.
  - Fan-out coaching generation per flagged move.
  - Fan-in and compose single response payload.
  - Persist result + operation metadata.

### Data tier
- Azure Table Storage
  - Games metadata table.
  - Analysis/coaching result table.
  - Idempotency/operation status table.

### AI tier
- Azure OpenAI GPT-4o (via Azure AI Foundry)
  - Prompt templates with role-aware wording:
    - User move: “You moved …”
    - Opponent move: “Opponent moved …”

## 5) Initial bounded contexts and service seams
- Ingestion Context
  - Chess.com proxy adapter, pagination mapping, normalization.
- Analysis Context
  - Move classification and expected points delta computation.
- Coaching Context
  - Prompt construction, policy constraints, batch composition.
- Presentation Context
  - Board rendering overlays and move timeline.

Design intent: keep domain logic framework-agnostic and isolate adapters (HTTP, Table Storage, OpenAI).

## 6) Draft API contract details for architect
### `GET /api/chesscom/users/{username}/games?page={n}&pageSize=12`
- Request params: username, page>=1, pageSize fixed to 12 in MVP.
- Response:
  - `items[]` normalized game summaries
  - `page`, `pageSize`, `hasMore`
  - `sourceTimestamp`

### `POST /api/analysis/batch-coach`
- Request body:
  - `gameId`
  - `sidePerspective` (white|black)
  - `engineConfig` (mode, depth, threads, timePerMoveMs)
  - `classifiedMoves[]`
    - SAN/UCI move, ply index, class, expected-points delta, fenBefore/fenAfter
- Response body:
  - `summary`
  - `coaching[]` (one per Mistake/Miss/Blunder)
  - `analysisMetadata`
  - `operationId`

## 7) Data model seed (Azure Table Storage)
### Table: `GameIndex`
- PartitionKey: `player#{username}`
- RowKey: `game#{chessComGameId}`
- Columns: date, opponent, result, opening, timeControl, source etag/hash

### Table: `AnalysisBatch`
- PartitionKey: `game#{gameId}`
- RowKey: `batch#{analysisVersion}#{timestamp}`
- Columns: engineConfig, summary metrics, payloadUri/inlineCompressed, ttlDate

### Table: `OperationState`
- PartitionKey: `op#{operationId}`
- RowKey: `v1`
- Columns: requestHash, status, startedAt, completedAt, retryCount, errorCode

Retention policy target: 30 days via lifecycle/cleanup process.

## 8) Reliability and idempotency baseline
- Client provides idempotency key for `batch-coach`.
- Server computes request hash and checks `OperationState` first.
- Durable orchestration must be replay-safe and deterministic.
- Retries with exponential backoff for OpenAI/transient network errors.
- Per-move timeout + batch timeout budget to cap cost/latency.

## 9) Security and compliance baseline
- Key Vault for Chess.com/OpenAI secrets and config.
- Enforce strict input validation and payload size limits.
- Redact prompt/response logs where sensitive.
- Use managed identity for Azure resource access.
- CORS allowlist only for known frontend origins.

## 10) Observability baseline
- Correlation IDs across API + orchestration + AI calls.
- Structured logging for move counts, class distribution, LLM token usage.
- Metrics:
  - p50/p95 ingestion latency
  - p50/p95 coaching batch latency
  - coaching failure rate
  - cost per analyzed game (estimate)
- Dashboards + alerts for failure spikes and timeout saturation.

## 11) Architecture decisions required next (ADR queue)
1. Functions hosting plan: Consumption vs Premium (latency vs cost).
2. Payload strategy: inline response vs blob pointer for large analyses.
3. Table schema evolution strategy and versioning.
4. Prompt template storage and release strategy.
5. API authentication mode for MVP (anonymous + rate-limit vs authenticated).
6. Caching strategy for Chess.com responses.

## 12) Risks to resolve during architecture
- Low-end client performance with deep analysis settings.
- LLM latency variability under fan-out load.
- Table Storage query limitations if reporting needs expand.
- Consistency between web and MAUI UX behavior for analysis timelines.

## 13) Definition of “Architecture Ready for Implementation”
- Component diagram approved.
- Sequence diagram for both key APIs approved.
- API schemas (request/response + validation) approved.
- Storage keys/partitions finalized and load-tested assumptions documented.
- Error taxonomy and retry policy documented.
- Observability checklist and SLO targets documented.

---
Prepared for: Architecture Agent
Prepared from approved PRD: [docs/prd/draft_prd.md](../prd/draft_prd.md)
Status: Ready for architecture design drafting.
