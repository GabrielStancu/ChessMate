# ChessMate Frontend

Angular 18 standalone frontend for ChessMate MVP.

## Development

- Install dependencies: `npm install`
- Start local app: `npm run start`
- Build production bundle: `npm run build`

## API behavior notes

- Games endpoint: `GET /api/chesscom/users/{username}/games?page={n}&pageSize=12`
- Hard refresh uses: `forceRefresh=true`
- Example hard refresh request:
	- `/api/chesscom/users/magnus/games?page=1&pageSize=12&forceRefresh=true`

## Browser persistence keys

- `lastSearchedUsername`
	- Stored when user runs a search.
	- Used to auto-run search on app load.
- `lastAnalysisMode`
	- Stored when user changes analysis mode (`quick` or `deep`).
	- Used as default mode on app load.
- `lastPromptVerbosity`
	- Stored when user changes coach verbosity (`concise`, `balanced`, `detailed`).
	- Sent to `POST /api/analysis/batch-coach` as `promptVerbosity`.
	- Used as default coach verbosity on app load.

## Coach prompt quality controls

- Coach prompt tone is grounded toward practical positional guidance instead of definitive tactical claims.
- Post-generation sanity behavior:
	- Contradictory claims trigger one regeneration with stronger grounding instructions.
	- Absolute/overconfident phrasing is softened using uncertainty qualifiers.
- Telemetry counters are emitted per coached move for:
	- `regenerationAttempts`
	- `softenedClaims`
	- `validationFailures`

## Branding assets

- Browser tab title is set to `ChessMate` in `src/index.html`.
- App logo uses `src/assets/images/logo.png` in the game search shell header.

## Board UI, Player Bars & Move Overlays (TKT-022)

### Board theme
- Board colors are overridden in `src/styles.css` targeting `.cm-chessboard.default`.
  - Light squares: `#ede8dc` (warm off-white, lighter than the default tan)
  - Dark squares: `#6b7280` (flat gray)
  - Border frame: `#2a2a32`

### New components

#### `app-player-bar` — `src/app/components/player-bar.component.ts`
Replaces the simple player name/rating rows above and below the board.

| Input | Type | Description |
|---|---|---|
| `username` | `string` (required) | Chess.com username |
| `rating` | `number \| null` | Player rating |
| `avatarUrl` | `string \| null` | Chess.com avatar URL (graceful fallback to initials) |
| `countryCode` | `string \| null` | ISO 3166-1 alpha-2 code (e.g. `US`, `RO`) — rendered as flag emoji |
| `fen` | `string` | Current board FEN for computing captured pieces |
| `capturedByColor` | `'white' \| 'black'` | Which side's captures to display in the strip |
| `position` | `'top' \| 'bottom'` | Semantic position for styling |

- Avatar loads from `avatarUrl`; on load error falls back to two-letter initials circle.
- Country code is converted to a Unicode regional indicator flag emoji.

#### `app-captured-pieces` — `src/app/components/captured-pieces.component.ts`
Shows thumbnails of pieces captured by a given side, grouped by type (Q→R→B→N→P).

| Input | Type | Description |
|---|---|---|
| `fen` | `string` | Current board FEN — used to diff against starting material |
| `capturedByColor` | `'white' \| 'black'` | The capturing side; opponent pieces on display |

- Piece thumbnails are 18×18px SVGs using `<use href="assets/cm-chessboard/pieces/standard.svg#...">` — the same pieces rendered on the board.
- Material advantage `+n` badge is shown when the capturing side is ahead in material value.
- Updates reactively on every position navigation (FEN input changes).

### Player avatar & country data contract

The `GET /api/chesscom/users/{username}/games` response now includes optional player metadata:

| Field | Type | Description |
|---|---|---|
| `whiteAvatarUrl` | `string \| null` | Avatar URL for the white player |
| `blackAvatarUrl` | `string \| null` | Avatar URL for the black player |
| `whiteCountry` | `string \| null` | ISO country code for white (e.g. `US`) |
| `blackCountry` | `string \| null` | ISO country code for black |

These are fetched live from `GET /pub/player/{username}` on the Chess.com API on the backend for each page response. They are best-effort and may be `null` if the profile call fails.

### Flag emojis on game search cards
The game search page (`app-game-search-page`) renders flag emojis next to player names using a `flagEmoji(countryCode)` helper that converts two-letter ISO codes to Unicode regional indicator pairs.

### Opening name badge
The analysis panel header shows a yellow badge with the opening name (ECO label from the game payload) below the "Game Analysis" title. The time control badge has been removed from the header.

