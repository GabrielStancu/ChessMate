export type OpeningSide = 'white' | 'black';

export interface OpeningDefinition {
  id: string;
  name: string;
  eco: string;
  forSide: OpeningSide;
  moves: string;
  fen: string;
  description: string;
  advantages: string[];
  drawbacks: string[];
  goals: string[];
  keySquares: string[];
}

export interface LichessExplorerMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  averageRating: number;
}

export interface LichessExplorerResponse {
  white: number;
  draws: number;
  black: number;
  moves: LichessExplorerMove[];
  topGames: unknown[];
  opening: { eco: string; name: string } | null;
}

export interface ExplorerContinuation {
  uci: string;
  san: string;
  totalGames: number;
  playRate: number;
  whiteWinRate: number;
  drawRate: number;
  blackWinRate: number;
  winRateFromPerspective: number;
}

export interface ExplorerPosition {
  fen: string;
  lastMove: { san: string; uci: string } | null;
  moveNumber: number;
  sideToMove: 'white' | 'black';
  openingName: string | null;
  continuations: ExplorerContinuation[];
}

export interface MoveHistoryEntry {
  fen: string;
  san: string;
  uci: string;
  moveNumber: number;
  sideToMove: 'white' | 'black';
}
