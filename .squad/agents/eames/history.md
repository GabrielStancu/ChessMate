# Eames — History

## Core Context

**Project:** ChessMate — Modern Chess Analyzer
**Role:** Tester — Tests, quality, edge cases, reviewer authority
**User:** (not configured)

## Project Knowledge

### Test Project
- `src/backend/ChessMate.Functions.Tests/` — main xUnit test project
- Existing test files: `ChessComGamesServiceTests.cs`, `IdempotencyTests.cs`, `Tkt006CoachMoveGeneratorTests.cs`, `Tkt008AnalysisBatchRetentionTests.cs`, `Tkt009CorsPolicyTests.cs`, `Tkt014ObservabilityTests.cs`, `Tkt018TacticalContextTests.cs`

### Key Test Scenarios by Domain
**Backend validation:**
- 400 for invalid username, page < 1, pageSize ≠ 12
- 400 for missing `Idempotency-Key` on POST batch-coach
- Duplicate idempotency key returns 200 with existing payload (no re-run)

**Caching:**
- Cache hit: return `GameIndex` data without upstream call
- Cache miss/stale: fetch upstream, normalize, upsert, return
- `cacheStatus` field reflects hit/miss/stale correctly

**Coaching:**
- Only Mistake/Miss/Blunder classifications routed to coaching activity
- Role-aware prompt: user move vs opponent move phrasing
- Partial success: completed items returned when subset fails/times out

**Table Storage:**
- Partition/row key strategy matches system_design.md locked schema
- `schemaVersion` present on all persisted entities
- `expiresAtUtc` set to 30 days for all persisted rows
- Cleanup job deletes expired rows idempotently

### DoD Verification Approach
- Read the ticket DoD before reviewing any implementation
- Reject if happy-path test OR error-path test is missing
- Contract tests must only assert on public request/response shape

## Learnings

*(Append new learnings below as work progresses)*
