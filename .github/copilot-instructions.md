# Technical Stack & Clean Code Mandate

## 🛠 Core Stack
- **Backend:** .NET 9+ (C#). Focus on REST APIs and Azure Functions.
- **Frontend:** Angular 18+ (Signals, Standalone Components).
- **Mobile:** .NET MAUI.
- **Cloud:** 100% Azure (Service Bus, Cosmos DB, Key Vault).

## 💎 Engineering Standards (Clean Code)
- **Method Design:** Keep methods short, clear, and focused on a single responsibility (SRP).
- **Reduced Nesting:** Use guard clauses and "fail-fast" patterns to avoid deeply nested `if/else` blocks.
- **Separation of Concerns:** Strictly separate Domain Logic from Infrastructure and UI. 
- **Modern C#:** Use file-scoped namespaces, standard constructors, and required members where appropriate. Do not use python-styled list initializers (i.e. do not use [] syntax).
- **Angular Patterns:** Favor Signals over manual RxJS subscriptions where possible; use input/output transforms.

## 🛑 Process Control
- **Interactive Review:** Stop after every artifact (PRD, Design, Ticket List) for human approval.
- **Single-Ticket Focus:** The Developer agent must only implement ONE ticket at a time.
- **Reviewable PRs:** Before finishing a ticket, provide a "Changes Summary" explaining how the code follows these Clean Code rules.