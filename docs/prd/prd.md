# Draft PRD — Modern Chess Analyzer

## 1) Product Summary
Modern Chess Analyzer is a minimalist, high-performance chess game analysis app that delivers Chess.com-like insight depth with a flatter modern UI and AI coaching.

Primary value proposition:
- Low-cost scalable analysis by running Stockfish.js (WASM) in-browser via Web Workers.
- Rich post-game understanding through move classification + LLM explanations.
- Fast ingestion of Chess.com games through a backend proxy.

## 2) MVP Scope (Locked)
### In scope
- Search games by Chess.com username.
- Show paginated game list (12 games/page).
- Analyze one selected full game end-to-end.
- Two analysis modes: `Quick` and `Deep`.
- User-configurable engine params: depth, threads, time-per-move.
- Move classification via Expected Points / Win Expectancy model:
  - Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Miss, Blunder, Book.
- Visual overlays:
  - Start/end square dim highlights.
  - Best-move arrows.
  - Classification icon near destination square.
- AI Coach panel with PNG avatar.
- GPT coaching generated for each Mistake/Miss/Blunder.
- Batch response contract: analysis + coaching returned in one payload.

### Visual style lock (MVP web)
- UI style direction is **mature, flat modern, and minimalist** with chess-focused visual hierarchy.
- The game search/landing experience must align with the attached reference style: dark premium background treatment, restrained accent color usage, clear typography, and clean card/list composition.
- Keep visual rendering flat (no skeuomorphic textures), with subtle depth only through spacing, borders, and soft contrast.
- Prefer simple geometric iconography and avoid playful/cartoon mascot styling for core app surfaces.

## 3) Clarifications Captured
1. MVP user flow: import recent games → analyze one full game → review coach insights.
2. Runtime preference: Azure Functions + Durable Functions (serverless-first).
3. Retention policy: 30 days for analysis/coaching artifacts.
4. Coach timing: auto-generate within analysis batch (single payload).

## 4) User Flow (MVP)
1. User enters Chess.com username.
2. Backend proxy fetches recent games and returns page 1 (12 items).
3. User pages through results and selects one game.
4. Client runs Stockfish.js local analysis under selected mode/params.
5. Client submits classification events to backend for coaching generation.
6. Backend runs coaching batch and returns unified payload.
7. UI renders timeline, board overlays, and coach explanations.

## 5) Functional Requirements
### FR-1 Game ingestion
- API endpoint to search games by username.
- Must support pagination of 12 games/page.
- Backend must proxy Chess.com API to avoid CORS constraints.

### FR-2 Analysis controls
- Toggle between `Quick` and `Deep` presets.
- Advanced settings: depth, threads, time-per-move.
- Input validation with guard clauses and fail-fast responses.

### FR-3 Classification model
- Apply Expected Points/Win Expectancy thresholds to each move.
- Persist classification result per ply.

### FR-4 Visual interaction
- Board supports SVG piece sets and flat, modern minimalist styling aligned to the locked mature visual direction.
- Show dimmed origin/destination markers and best-move arrows (if the move is classified as Good, Inaccuracy, Mistake, Miss, Blunder).
- Show classification status icon near destination square (with the color specified in the list below).
- Classification color mapping (MVP):
  - Brilliant: light blue
  - Great: faded dark blue
  - Best: dark green
  - Good: faded green
  - Miss: faded red
  - Mistake: neutral red
  - Blunder: dark red

### FR-5 AI coach
- Generate explanation for each Mistake/Miss/Blunder including:
  1) Why the move was wrong
  2) How opponent can exploit it
  3) Suggested plan
- Return coaching + analysis in a single batch payload. The coach should differentiate between user moves (where the formulation should be "You moved the knight to ...") vs opponent moves (where the formulation should be "Opponent moved the knight to ...")

## 6) Non-Functional Requirements
- Clean code: SRP, SOLID, short methods, guard clauses, strict SoC.
- Performance: initial analysis UX responsive for typical 40-move games.
- Cost control: keep engine compute local, cloud only for ingestion + coaching.
- Reliability: idempotent batch request handling for coaching jobs.
- Security: API keys/secrets in Azure Key Vault; no secrets in client.

## 7) Consultative Azure Comparison (Recommended vs Alternatives)
### A) Compute for API + orchestration
**Recommended:** Azure Functions + Durable Functions
- Best fit for bursty, evented workloads and serverless-first requirement.
- Durable orchestration helps with batch coaching fan-out/fan-in.
- Lower idle cost than always-on services.

**Alternative 1:** Azure App Service (Web App + worker)
- Pros: easier long-running HTTP debugging and operational familiarity.
- Cons: baseline cost higher; less natural for serverless orchestration.

**Alternative 2:** Azure Container Apps
- Pros: container flexibility, strong scale controls, Dapr/event integrations.
- Cons: extra operational surface vs Functions for this MVP.

### B) Persistence for games + analysis
**Recommended:** Azure Table Storage
- Aligns with current requirement and low-cost key-value style access.
- Works for denormalized entities (game header, move-classification blobs).

**Alternative:** Azure Cosmos DB (NoSQL)
- Pros: richer querying, global distribution, lower-latency point reads at scale.
- Cons: higher cost/complexity for early MVP needs.

### C) Coaching LLM
**Recommended:** Azure OpenAI GPT-4o provided through Microsoft Azure AI Foundry
- Strong quality for chess explanation generation.
- Enterprise controls, private networking options, Azure-native governance.

**Alternative:** OpenAI public API
- Pros: potentially faster feature access in some cases.
- Cons: reduced Azure governance integration and cross-service policy consistency.

### D) Frontend hosting (web)
**Recommended:** Azure Static Web Apps (Angular SPA)
- Native static hosting + API integration pattern.
- Good fit for Angular and CDN-backed delivery.

**Alternative:** Azure Storage Static Website + CDN
- Pros: minimal hosting cost.
- Cons: fewer integrated app features than SWA.

## 8) API/Contract Notes (Draft)
- `GET /api/chesscom/users/{username}/games?page={n}&pageSize=12`
- `POST /api/analysis/batch-coach`
  - Input: game id, classified moves, requested coach verbosity/mode.
  - Output: analysis summary + per-move coach explanations in one payload.

## 9) Risks & Mitigations (MVP)
- Chess.com API limits/availability → add caching and retry with backoff.
- Client CPU constraints on low-end devices → expose quick mode defaults and cancellation.
- LLM latency/cost spikes → batch prompts, cap explanation length, configurable token budgets.

## 10) Success Metrics (MVP)
- Time-to-first-analysis result.
- Coaching completion rate per analyzed game.
- Median API latency for game ingestion endpoint.
- Cost per analyzed game (cloud-side only).
- User completion rate of full flow (import → analyze → coach review).

---
Status: Approved for handoff to Architecture agent.