# Tech Lead Handoff — Execution Starter

## 1) Required Inputs (Authoritative)
- Product source of truth: [docs/prd/prd.md](../prd/prd.md)
- Approved architecture: [docs/architecture/system_design.md](./system_design.md)
- Context lineage: [docs/architecture/architect_handoff.md](./architect_handoff.md)

## 2) Scope Lock (MVP)
- Web app only (Angular 18, mobile-responsive browser UX).
- User flow: username search -> select game -> local Stockfish.js analysis -> batch coaching review.
- Coaching triggers: Mistake, Miss, Blunder.
- Single payload response for `POST /api/analysis/batch-coach` (always inline for MVP).
- Retention target: 30 days.
- UI style lock for frontend artifacts: thick dark outlines, rounded edges, minimalist facial features, flat vibrant colors, white border around the shape.

## 3) Locked Architecture Decisions
1. Compute: Azure Functions (Consumption) + Durable Functions orchestration.
2. Storage: Azure Table Storage (`GameIndex`, `AnalysisBatch`, `OperationState`).
3. AI: Azure OpenAI GPT-4o via Azure AI Foundry.
4. Auth (MVP): anonymous endpoints + strict rate limiting/WAF; roadmap to Entra auth.
5. Cache policy: Chess.com read-through cache with 15-minute TTL.
6. Failure mode: partial coaching allowed (completed items + warnings).
7. SLO targets: `batch-coach` p95 <= 12s (Quick), <= 30s (Deep).
8. Region: single Azure region for MVP.
9. Service Bus/Cosmos DB: not in MVP baseline.

## 4) API Contracts to Keep Stable
- `GET /api/chesscom/users/{username}/games?page={n}&pageSize=12`
- `POST /api/analysis/batch-coach`

If any contract change is needed, require explicit ADR update before implementation.

## 5) Data Contract/Schema Rules
- Use `schemaVersion` on all persisted entities and API envelopes.
- Additive-only changes in v1.
- Breaking changes require versioned contract path and migration note.

## 6) Reliability/Security/Observability Must-Haves
- Idempotency key required for `batch-coach`.
- Durable orchestrator deterministic; all IO in activities.
- Managed identity + Key Vault for secrets.
- Strict input validation + payload limits + CORS allowlist.
- Correlation IDs across API/orchestration/LLM calls.
- Track p50/p95 latency, failure rate, timeout saturation, estimated cost/game.

## 7) Definition of Ready for Tech Lead Planning
- Component and sequence diagrams are approved in [docs/architecture/system_design.md](./system_design.md).
- ADRs are locked for MVP baseline.
- Storage keys/partitions are defined.
- Reliability/security/observability baselines are defined.

## 8) Recommended First Work Sequence (Tech Lead Agent)
1. Create implementation ticket list from architecture (small vertical slices).
2. Select exactly one first ticket (per single-ticket focus rule).
3. Start with backend foundation slice:
   - Function app skeleton (.NET 9 isolated)
   - `GET games` endpoint contract + validation + cache read-through
   - telemetry/correlation baseline
4. Get review approval before moving to next ticket.

## 9) Constraints to Preserve During Execution
- Clean architecture + SOLID + SRP + guard clauses.
- Keep methods short and focused.
- Separate domain logic from adapters/infrastructure.
- Do not broaden scope beyond MVP/UI parity intent.
