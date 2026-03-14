# ChessMate

Modern Chess Analyzer — a minimalist, high-performance chess game analysis web app.

Features
- Search recent Chess.com games by username (paginated).
- Local Stockfish.js (WASM) analysis in browser WebWorkers (Quick / Deep modes).
- Move classification, visual overlays, and LLM-powered coaching (batch payload).
- UX polish: persisted last search/mode, hard-refresh to bypass 15-minute cache.

Quick links
- Product spec: [docs/prd/prd.md](docs/prd/prd.md)
- Architecture: [docs/architecture/system_design.md](docs/architecture/system_design.md)
- Backlog / tickets: [docs/backlog/tickets_to_import.md](docs/backlog/tickets_to_import.md)
- Azure deployment guide: [docs/azure/deployment.md](docs/azure/deployment.md)

Getting started
- Frontend: see `src/frontend/chessmate-frontend/README.md`
- Backend: see `src/backend/README.md`

Status: MVP approved — see PRD for scope and constraints.