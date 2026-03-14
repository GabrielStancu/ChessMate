# Ariadne — History

## Core Context

**Project:** ChessMate — Modern Chess Analyzer
**Role:** Frontend Dev — Angular 18, Signals, Stockfish.js WASM worker
**User:** (not configured)

## Project Knowledge

### Frontend App Structure
- App root: `src/frontend/chessmate-frontend/`
- Framework: Angular 18, standalone components, signals-first
- Build: `angular.json`, `package.json`, `tsconfig.json`

### UI Style Lock
- Mature, flat, modern minimalist — NOT cartoon/mascot styling
- Dark premium background, restrained accent colors, clean typography
- Flat rendering only (no textures). Subtle depth through spacing/borders/contrast.

### Classification Colors
- Brilliant: light blue | Great: faded dark blue | Best: dark green | Good: faded green
- Miss: faded red | Mistake: neutral red | Blunder: dark red

### Stockfish.js Architecture
- Must run entirely in Web Worker — no main-thread blocking
- Input: FEN position + analysis params (depth, threads, timePerMoveMs)
- Output: best move, evaluation, move classification
- Worker wraps Stockfish WASM and communicates via postMessage

### API Contracts (Frontend Perspective)
- `GET /api/chesscom/users/{username}/games?page=n&pageSize=12`
  - Response: `{ items[], page, pageSize, hasMore, sourceTimestamp, cacheStatus, cacheTtlMinutes }`
- `POST /api/analysis/batch-coach`
  - Request: gameId, sidePerspective, engineConfig, classifiedMoves[]
  - Response: `{ summary, coaching[], analysisMetadata, operationId }`
  - Requires: `Idempotency-Key` header

### Coaching Trigger
- Only Mistake, Miss, Blunder classifications trigger coaching generation

## Learnings

*(Append new learnings below as work progresses)*
