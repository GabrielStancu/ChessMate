# Squad Team

> ChessMate — Modern Chess Analyzer

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. |

## Members

| Name | Role | Specialization | Badge |
|------|------|---------------|-------|
| Cobb | Lead | Architecture, scope decisions, code review | 🏗️ Lead |
| Yusuf | Backend Dev | .NET 9, Azure Functions, Durable Functions, C# | 🔧 Backend |
| Ariadne | Frontend Dev | Angular 18, Signals, Stockfish.js WASM worker | ⚛️ Frontend |
| Eames | Tester | Tests, quality, edge cases | 🧪 Tester |
| Scribe | Session Logger | Memory, decisions, session logs | 📋 Silent |
| Ralph | Work Monitor | Work queue, backlog, keep-alive | 🔄 Monitor |

## Project Context

- **Project:** ChessMate — Modern Chess Analyzer
- **Stack:** .NET 9 Azure Functions (isolated) · Durable Functions · Angular 18 (Signals, standalone) · WASM Stockfish (Web Worker) · Azure OpenAI GPT-4o · Azure Table Storage · Azure Key Vault
- **Description:** Personal chess analysis tool. Backend proxies Chess.com API. Browser runs local Stockfish.js analysis via Web Worker. Azure OpenAI GPT-4o generates coaching for Mistakes, Misses, and Blunders in a single batch payload.
- **Key APIs:** `GET /api/chesscom/users/{username}/games?page={n}&pageSize=12` · `POST /api/analysis/batch-coach`
- **Architecture:** Clean architecture (Domain/Application/Infrastructure/Functions layers), Durable Functions fan-out/fan-in for batch coaching, Azure Table Storage with `GameIndex`/`AnalysisBatch`/`OperationState` tables.
- **Created:** 2026-03-15

## Issue Source

*(Not connected — run "pull issues from owner/repo" to connect)*
