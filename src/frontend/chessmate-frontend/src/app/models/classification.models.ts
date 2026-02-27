export type MoveClassification =
  | 'Brilliant'
  | 'Great'
  | 'Best'
  | 'Excellent'
  | 'Good'
  | 'Inaccuracy'
  | 'Mistake'
  | 'Miss'
  | 'Blunder'
  | 'Book';

export interface ClassifiedMove {
  ply: number;
  san: string;
  from: string;
  to: string;
  piece: string;
  isUserMove: boolean;
  classification: MoveClassification;
  winExpectancyBefore: number;
  winExpectancyAfter: number;
  winExpectancyLoss: number;
  bestMove: string | null;
  opponentBestResponse: string | null;
  centipawnBefore: number | null;
  centipawnAfter: number | null;
  centipawnLoss: number;
  fenBefore: string;
  fenAfter: string;
}

export interface FullGameAnalysisResult {
  gameId: string;
  playerColor: 'white' | 'black';
  classifiedMoves: ClassifiedMove[];
  engineConfig: { depth: number; threads: number; timePerMoveMs: number };
  analysisMode: string;
  totalPositions: number;
  analyzedAt: string;
}

export const CLASSIFICATION_COLORS: Record<MoveClassification, string> = {
  Brilliant: '#26C6DA',
  Great: '#3949AB',
  Best: '#2E7D32',
  Excellent: '#00897B',
  Good: '#66BB6A',
  Inaccuracy: '#F57C00',
  Mistake: '#EF5350',
  Miss: '#D32F2F',
  Blunder: '#B71C1C',
  Book: '#78909C'
};

export const CLASSIFICATION_SYMBOLS: Record<MoveClassification, string> = {
  Brilliant: '!!',
  Great: '!',
  Best: '\u2605',
  Excellent: '\u2713',
  Good: '\u2713',
  Inaccuracy: '?!',
  Mistake: '?',
  Miss: '??',
  Blunder: '??',
  Book: '\u{1F4D6}'
};

/**
 * Standard piece values for sacrifice detection.
 */
export const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

/**
 * Contextual move data passed to the classifier for richer heuristics.
 */
export interface MoveContext {
  /** Piece that moved (chess.js lowercase: p, n, b, r, q, k) */
  piece: string;
  /** Captured piece, if any */
  captured: string | undefined;
  /** Centipawn eval from the moving side's perspective, before the move */
  cpMovingSideBefore: number;
  /** Centipawn eval from the moving side's perspective, after the move */
  cpMovingSideAfter: number;
  /** Ply number (1-based) */
  ply: number;
  /**
   * Whether this move is a material sacrifice — the moved piece lands on
   * a square attacked by the opponent and either:
   *   (a) it's not a capture (piece left en-prise), or
   *   (b) it IS a capture but the captured piece is worth less than the
   *       moved piece (losing exchange, e.g. queen takes pawn on attacked square).
   */
  isSacrifice: boolean;
}

/**
 * Hybrid classification thresholds.
 * Bad moves use centipawn loss (CP-based, like Chess.com).
 * Good moves use win-expectancy loss (WE-based) for Excellent,
 * and a CP-based "near-best" gate for Best.
 */
export const CLASSIFICATION_THRESHOLDS = {
  /** CP loss thresholds for bad-move tiers */
  blunderCp: 300,
  missCp: 200,
  mistakeCp: 100,
  inaccuracyCp: 50,
  /** A move within this many CP of the engine's best is "near-best" (Best) */
  nearBestCp: 10,
  /** Wider near-best gate for Great (allows slightly sub-optimal plays) */
  nearBestCpGreat: 15,
  /** Min CP improvement for Great (position got better by this much) */
  greatCpGain: 30,
  /** WE loss below this qualifies as Excellent (keeps WE sensitivity) */
  excellentWe: 1.5
} as const;

/**
 * Move classes eligible for board overlays (dim markers + best-move arrow).
 */
export const OVERLAY_ELIGIBLE_CLASSES: ReadonlyArray<MoveClassification> = [
  'Good',
  'Inaccuracy',
  'Mistake',
  'Miss',
  'Blunder'
];

/**
 * Move classes eligible for coaching (sent to batch-coach API).
 */
export const COACHING_ELIGIBLE_CLASSES: ReadonlyArray<MoveClassification> = [
  'Inaccuracy',
  'Mistake',
  'Miss',
  'Blunder'
];
