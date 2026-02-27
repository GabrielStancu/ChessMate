# Observability — KQL Query Baseline

This folder contains baseline KQL (Kusto Query Language) queries for monitoring ChessMate backend SLOs and operational health in Azure Application Insights / Log Analytics.

## How to Use

1. Open the [Azure Portal](https://portal.azure.com).
2. Navigate to your Application Insights resource → **Logs** (or Log Analytics workspace).
3. Paste the contents of any `.kql` file into the query editor and run.
4. Pin queries as dashboard tiles or create alert rules from query results.

## Query Index

| File | Purpose |
|---|---|
| `get-games-latency.kql` | p50/p95 latency for GET games endpoint |
| `batch-coach-latency.kql` | p50/p95 latency for POST batch-coach, split by analysis mode |
| `slo-threshold-alerts.kql` | SLO breach detection: Quick/Deep p95 > 60s |
| `failure-rate-summary.kql` | Failure rate breakdown by taxonomy code |
| `timeout-saturation.kql` | Coaching activity timeout vs success ratio |
| `coaching-cost-estimate.kql` | Estimated cloud cost per analyzed game (token-based) |
| `cache-hit-rate.kql` | Cache hit/miss/stale ratio for GET games |

## SLO Targets (MVP)

| Endpoint | Metric | Target |
|---|---|---|
| GET games | p95 latency | Best-effort (no hard SLO in MVP) |
| POST batch-coach (Quick) | p95 latency | ≤ 60s |
| POST batch-coach (Deep) | p95 latency | ≤ 60s |

## Notes

- Queries use a default `timeRange` of 24 hours. Adjust the `ago()` duration as needed.
- Custom events (`api.getgames.completed`, `api.batchcoach.completed`) carry dimensions like `cacheStatus`, `analysisMode`, `failureCode`.
- Custom metrics (`batchcoach.coachmove.*`) carry per-move coaching telemetry.
- All telemetry is enriched with `CorrelationId` via a custom `ITelemetryInitializer`.
