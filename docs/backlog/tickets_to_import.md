# Tickets to Import — Modern Chess Analyzer (MVP)

## Execution Rules (Locked)
- Product source: `docs/prd/prd.md`
- Implementation baseline: `docs/architecture/system_design.md`
- Kickoff checklist: `docs/architecture/tech_lead_handoff.md`
- Scope lock: MVP web-only flow
- Discipline lock: implement exactly one ticket at a time
- Contract lock: keep `GET /api/chesscom/users/{username}/games?page={n}&pageSize=12` and `POST /api/analysis/batch-coach` stable
- UI style lock (future frontend tickets): Thick dark outlines, rounded edges, minimalist facial features, flat vibrant colors, white border around the shape

---

## TKT-001 — Backend Foundation Slice (.NET 9 Isolated)
**Title**
Function App skeleton + correlation baseline + MVP API stubs

**Description**
Create the backend baseline for Azure Functions (.NET 9 isolated) with project structure aligned to clean architecture (Domain/Application/Infrastructure/Functions adapters). Add HTTP trigger stubs for locked endpoints, centralized guard-clause validation utilities, and correlation ID propagation middleware. Include initial Application Insights wiring and configuration binding (no secrets in code).

**Definition of Done (.NET/Azure)**
- .NET 9 isolated Azure Functions project builds successfully.
- Endpoints exist with locked routes and return `501` placeholders behind validated request envelopes.
- Correlation ID is accepted/generated and logged on every request/response path.
- App Insights telemetry client is configured through DI and emits request traces.
- Configuration uses managed identity-compatible settings structure (Key Vault references ready; no inline secrets).
- Code follows SRP/guard-clause style with short methods and separated layers.

---

## TKT-002 — GET Games Contract + Input Validation
**Title**
Implement GET games contract and fail-fast validation

**Description**
Implement `GET /api/chesscom/users/{username}/games?page={n}&pageSize=12` request handling with strict validation: username format, page >= 1, pageSize forced to 12. Return normalized response envelope fields required by design (`items,page,pageSize,hasMore,sourceTimestamp,cacheStatus,cacheTtlMinutes`).

**Definition of Done (.NET/Azure)**
- Endpoint returns `400` for invalid input with deterministic validation error payload.
- `pageSize` is enforced as `12`; any other value is rejected fail-fast.
- Success payload includes all required fields and `schemaVersion`.
- Unit tests cover validation guards and response envelope mapping.
- Function traces include username/page/pageSize and correlation ID.

---

## TKT-003 — Chess.com Proxy Adapter + Read-Through Cache
**Title**
Add Chess.com proxy integration with 15-minute TTL cache

**Description**
Implement infrastructure adapter for Chess.com archives fetch and normalization pipeline. Add read-through cache backed by Azure Table Storage `GameIndex` with freshness TTL = 15 minutes. Prefer cache when fresh; on miss/stale fetch upstream, normalize, upsert, then return page.

**Definition of Done (.NET/Azure)**
- Adapter calls Chess.com API through `HttpClientFactory` with retry/backoff policy for transient failures.
- Table Storage `GameIndex` reads/writes use locked key strategy (`player#{normalizedUsername}` / `game#{reverseTicks}#{chessComGameId}`).
- Cache hit/miss/stale behavior is deterministic and reflected in `cacheStatus` + `sourceTimestamp`.
- Endpoint continues to return paginated 12 items with `hasMore` semantics.
- Integration tests cover cache hit and cache miss paths.

---

## TKT-004 — Durable Batch-Coach Orchestration Skeleton
**Title**
Create Durable orchestration for batch coaching fan-out/fan-in

**Description**
Build orchestrator and activity contracts for `POST /api/analysis/batch-coach`. Orchestrator must remain deterministic and select only Mistake/Miss/Blunder moves for fan-out to coaching activity, then fan-in to one unified response envelope.

**Definition of Done (.NET/Azure)**
- HTTP trigger starts/executes Durable orchestration for batch-coach flow.
- Orchestrator contains no direct I/O; all external calls are activity-based.
- Only eligible classifications (Mistake/Miss/Blunder) are routed to coach activity.
- Unified response contract includes summary, coaching items, metadata, and `operationId`.
- Durable replay-safe logging is implemented.

---

## TKT-005 — Idempotency + OperationState Persistence
**Title**
Implement idempotency gate and operation lifecycle tracking

**Description**
Require `Idempotency-Key` for `POST /api/analysis/batch-coach`. Add canonical request hashing and dedupe checks via `OperationState` table. Return previously completed payload for duplicate requests; otherwise create running operation and proceed.

**Definition of Done (.NET/Azure)**
- Missing idempotency key returns validation failure (`400`).
- Duplicate request (same semantic payload + key) replays existing completed response (`200`) without re-running coaching.
- `OperationState` table rows follow locked key strategy (`op#{operationId}` / request-hash lookup row).
- Operation statuses transition: `Running -> Completed|Failed|PartialCoaching` with timestamps.
- Tests verify dedupe behavior and race-safe update handling.

---

## TKT-006 — Azure OpenAI Coaching Activity
**Title**
Integrate Azure OpenAI GPT-4o for role-aware coaching generation

**Description**
Implement Durable activity that generates coaching for one flagged move using Azure OpenAI GPT-4o via Azure AI Foundry endpoint. Prompt must produce role-aware narration (“You moved …” vs “Opponent moved …”) and include: why wrong, exploit path, suggested plan.

**Definition of Done (.NET/Azure)**
- Activity obtains model config and secrets via managed identity/Key Vault-backed configuration.
- Prompt contract enforces required 3-part explanation output.
- Role-aware phrasing is correct for user vs opponent moves.
- Token and latency telemetry is emitted per move call.
- Transient AI failures apply retry policy with bounded attempts.

---

## TKT-007 — Partial Success + Failure Taxonomy
**Title**
Return partial coaching with warnings and standardized failure codes

**Description**
Implement partial success behavior for batch coaching: completed items returned even if some moves fail/timeout. Standardize failure taxonomy (`ValidationError`, `RateLimited`, `UpstreamUnavailable`, `Timeout`, `OrchestrationFailed`, `PartialCoaching`) and include warning metadata.

**Definition of Done (.NET/Azure)**
- Batch response contains successful coaching items plus warning list when subset fails.
- Failures map to taxonomy codes consistently across API/orchestration/activity layers.
- Quick/Deep timeout budgets are enforced and surfaced in diagnostics.
- Contract tests validate warning envelope shape without breaking base payload contract.

---

## TKT-008 — AnalysisBatch Storage + 30-Day Retention
**Title**
Persist coaching artifacts and implement retention cleanup

**Description**
Persist final unified analysis/coaching payload into `AnalysisBatch` table with `schemaVersion`, `createdAtUtc`, and `expiresAtUtc`. Add scheduled cleanup Function that deletes expired entities from `GameIndex`, `AnalysisBatch`, and `OperationState` safely with backoff.

**Definition of Done (.NET/Azure)**
- `AnalysisBatch` rows use locked partition/row key strategy from system design.
- All persisted entities include `schemaVersion` and `expiresAtUtc` set to 30 days.
- Timer-trigger cleanup function runs and removes expired rows idempotently.
- Cleanup emits metrics for scanned/deleted rows and failures.

---

## TKT-009 — API Security Baseline (MVP Anonymous)
**Title**
Harden public endpoints with validation, limits, CORS allowlist, and throttling hooks

**Description**
Implement MVP security controls for anonymous access: strict payload limits, enum allowlists, CORS allowlist, and rate-limit integration points compatible with Azure edge controls (WAF/API gateway policies). Ensure no sensitive prompt data is logged unredacted.

**Definition of Done (.NET/Azure)**
- Request body size and move-count limits enforced server-side.
- CORS allowlist is environment-configurable and validated at startup.
- Rate-limit headers/telemetry hooks are emitted for downstream policy enforcement.
- Logs redact sensitive fields and exclude raw secret content.
- Security checklist items are documented in backend README.

---

## TKT-010 — Angular Shell + Username Search + Game List
**Title**
Build Angular MVP shell with search and 12-item paginated game list

**Description**
Create Angular 18 standalone application shell (signals-first) with username input, search action, and paginated game list consuming GET games API. Keep web-only MVP flow and mobile-responsive layout foundation.

**Definition of Done (.NET/Azure)**
- Angular app uses standalone components and signal-based state for search/list.
- UI calls locked GET endpoint and renders 12 items/page with next/previous paging.
- Validation errors from API are surfaced with user-friendly fail-fast messaging.
- Any new iconography/illustration assets in shell states follow locked style (thick dark outlines, rounded edges, minimalist facial features where applicable, flat vibrant colors, white border around the shape).
- Environment config supports Azure Static Web Apps deployment settings.

---

## TKT-011 — Stockfish.js Worker Analysis Controller
**Title**
Implement local browser analysis modes and engine parameter controls

**Description**
Add Stockfish.js (WASM) worker orchestration in the Angular client with Quick/Deep presets and advanced controls (depth, threads, time-per-move). Ensure responsive UX with cancellation support and no backend engine compute.
Selecting a game must open an analysis board view. Users must be able to navigate between positions/moves on that board, and each navigated position must be analyzed by Stockfish.js in the browser.

**Definition of Done (.NET/Azure)**
- Engine runs in Web Worker(s) only; UI thread remains responsive during analysis.
- Quick/Deep presets apply deterministic parameter values.
- Advanced parameter guard clauses prevent invalid values.
- Selecting a game opens a board analysis screen with move/position navigation controls.
- Navigating to any position triggers (or serves cached) Stockfish.js evaluation for that exact board state.
- Navigation controls are limited to first/previous/next/last move (no jump-to-move input in MVP).
- Evaluation cache key uses `FEN + engineConfig` to reuse prior position analysis results deterministically.
- Fast navigation cancels/ignores stale in-flight evaluations so only the latest selected position result is rendered.
- Analysis metadata includes selected mode/config for batch payload submission.

---

## TKT-012 — Move Classification + Board Overlays
**Title**
Apply Expected Points classification and render board visual overlays

**Description**
Implement client-side move classification using defined MVP classes and thresholds, then render board overlays: origin/destination dim highlights, best-move arrows (for Good/Inaccuracy/Mistake/Miss/Blunder), and classification icon near destination square with locked color mapping.

**Definition of Done (.NET/Azure)**
- Classification pipeline outputs per-ply label and confidence/score metadata.
- Overlay rendering matches MVP rules for eligible move classes and icon placement.
- Color mapping follows PRD locked palette semantics for listed classes.
- Classification icon visuals follow locked style (thick dark outlines, rounded edges, flat vibrant colors, white border around the shape; minimalist facial features only for pieces/mascot-like/icon character assets).
- Classification artifacts are packaged for `POST /api/analysis/batch-coach` input.

---

## TKT-013 — Coach Panel + Batch Payload Integration
**Title**
Integrate batch-coach API response into timeline and AI coach panel

**Description**
Wire Angular client to submit flagged moves and analysis metadata to `POST /api/analysis/batch-coach`, then render unified response (summary + per-move coaching) in right-side panel/timeline. Include operation correlation details for troubleshooting.

**Definition of Done (.NET/Azure)**
- Client sends idempotency key on every batch-coach request.
- Unified payload is rendered without secondary polling contract.
- UI distinguishes user/opponent explanations correctly.
- Partial coaching warnings are visible but do not block successful items.
- Coach panel avatar and related helper graphics (as well as pieces) align to locked style direction (thick dark outlines, rounded edges, minimalist facial features, flat vibrant colors, white border around the shape).

---

## TKT-014 — Observability + SLO Dashboarding Baseline
**Title**
Implement end-to-end telemetry and SLO measurement for Quick/Deep

**Description**
Finalize observability: structured logs, distributed correlation across API/Durable/activity/LLM, and baseline dashboards/queries for p50/p95 latency, failure rates, timeout saturation, and estimated cloud cost per game.

**Definition of Done (.NET/Azure)**
- Correlation IDs flow across HTTP triggers, orchestrator, activities, and AI calls.
- App Insights captures metrics for GET games and batch-coach latency (p50/p95).
- Alerts/queries exist for SLO thresholds (Quick p95 <= 60s, Deep p95 <= 60s).
- Telemetry includes cache status, flagged move count, and failure taxonomy tags.

---

## TKT-015 — Deployment Baseline (SWA + Functions + Key Vault)
**Title**
Prepare MVP deployment assets and environment contracts for Azure

**Description**
Create deployment-ready configuration baseline for Angular SPA on Azure Static Web Apps and backend Azure Functions with managed identity + Key Vault references. Keep single-region MVP and no Service Bus/Cosmos in baseline.

**Definition of Done (.NET/Azure)**
- Environment variable contracts documented for SWA and Functions.
- Managed identity access requirements are listed for Table Storage, Key Vault, and Azure OpenAI.
- Deployment docs preserve locked architecture decisions and excluded services.
- Smoke checklist validates both API contracts and web-only flow post-deploy.

---

## TKT-016 — Analysis Evaluation Bar + Game Evaluation Chart
**Title**
Add Chess.com-like vertical evaluation bar and game evaluation trend chart

**Description**
Implement the missing analysis visuals on the game analysis board page: a vertical position evaluation bar (current engine score) and an evaluation change chart across the full move timeline, similar in behavior to Chess.com analysis UX. These visuals must use existing analysis data/engine outputs and support synchronized updates while navigating positions.

**Definition of Done (.NET/Azure)**
- Analysis board page displays a vertical evaluation bar that reflects the currently selected position score from Stockfish.js.
- Analysis board page displays an evaluation trend chart across the game (move-by-move score progression).
- Evaluation bar and chart stay in sync with first/previous/next/last position navigation.
- Chart clearly indicates current selected move/position and updates when navigation changes.
- Quick/Deep analysis runs populate both bar and chart consistently using the same score source.
- Existing API contracts and core analysis flow remain unchanged.

---

## TKT-017 — Frontend Visual Styling Pass (Mature Flat Minimal)
**Title**
Apply production-ready visual design system and landing/search page styling

**Description**
Implement a full styling pass for the Angular web app so the UI matches the locked mature, flat modern, minimalist direction. The game search/landing page should align with the provided visual reference (dark premium atmosphere, clean typography, restrained accents, and polished card/list hierarchy) while preserving all existing functionality and contracts.

**Definition of Done (.NET/Azure)**
- Styling is applied app-wide (search, game list, analysis board view, right panel, error/empty/loading states) with consistent spacing, typography, and component states.
- Search/landing page layout aligns to the approved reference intent (mature flat minimal, dark hero treatment, clear primary CTA/input hierarchy).
- Existing functionality remains unchanged: no API contract, route, or behavior regressions.
- Visual tokens (colors, spacing, radius, typography scale) are centralized and reused; no scattered one-off inline styling.
- Accessibility baseline is preserved: readable contrast, visible focus states, and keyboard-navigable interactive elements.
- Responsive behavior is verified for desktop and mobile web breakpoints without breaking core MVP flow.

---

## TKT-018 — LLM Coach Prompt Grounding and Accuracy Hardening
**Title**
Harden coach prompts to prevent hallucinated tactical claims and board-state mismatches

**Description**
Refine the `batch-coach` prompt strategy and response validation to reduce edge-case inaccuracies (e.g., wrong pinned piece, invented tactical ideas, or claims not supported by the actual position). Prompt outputs must stay grounded in provided move/position context and remain role-aware (user vs opponent phrasing).

**Definition of Done (.NET/Azure)**
- Prompt template explicitly constrains the model to provided board/move context and forbids unsupported tactical claims.
- Role-aware narration remains correct for user vs opponent moves.
- Add a lightweight post-generation validation layer that flags or regenerates outputs containing contradictions with supplied position facts.
- Edge-case regression set is added (including pin-target confusion and invented motifs) and run in CI/local test workflow.
- Telemetry captures validation/regeneration counts and failure reasons for prompt-quality monitoring.
- Response contract remains stable (`POST /api/analysis/batch-coach`) and backward compatible.

---

## TKT-019 — Analysis Cache Reuse and Reload Path
**Title**
Load previously analyzed games from cache and skip redundant Stockfish + LLM reruns

**Description**
Fix the reload behavior so that once a game analysis is completed and persisted, reopening the same game reuses cached analysis/coaching artifacts instead of re-running the full local Stockfish.js analysis plus `batch-coach` flow. Implement deterministic cache lookup and freshness/version checks using the existing storage model and contracts.

**Definition of Done (.NET/Azure)**
- Reopening an already analyzed game first checks persisted analysis cache before starting a new analysis pipeline.
- When a valid cached artifact exists, UI loads analysis board data, evaluation timeline, and coach insights directly from cache.
- Stockfish.js + LLM flow is skipped on cache hit unless user explicitly requests re-analysis or cache is invalid/stale.
- Cache validity uses deterministic keying/version checks (game identity + analysis mode/config + schemaVersion/updated metadata).
- API response includes clear cache-source metadata for diagnostics (for example cache hit/miss reason).
- Regression tests cover cache hit reuse, stale/invalid cache fallback, and explicit re-analysis behavior.
