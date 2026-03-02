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

## Branding assets

- Browser tab title is set to `ChessMate` in `src/index.html`.
- App logo uses `src/assets/images/logo.png` in the game search shell header.
