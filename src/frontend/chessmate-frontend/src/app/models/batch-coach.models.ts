import { ClassifiedMove, COACHING_ELIGIBLE_CLASSES, FullGameAnalysisResult } from './classification.models';

/**
 * Mirrors backend BatchCoachMoveEnvelope record.
 */
export interface BatchCoachMovePayload {
  ply: number;
  classification: string;
  isUserMove: boolean;
  move: string | null;
  piece: string | null;
  from: string | null;
  to: string | null;
}

/**
 * Mirrors backend BatchCoachRequestEnvelope record.
 */
export interface BatchCoachRequestPayload {
  gameId: string;
  moves: BatchCoachMovePayload[];
  analysisMode: string | null;
  metadata: Record<string, string> | null;
}

/**
 * Build a batch-coach API request payload from a full-game analysis result.
 * Only coaching-eligible moves (Mistake, Miss, Blunder) are included.
 */
export function buildBatchCoachPayload(result: FullGameAnalysisResult): BatchCoachRequestPayload {
  const eligibleMoves = result.classifiedMoves
    .filter((m: ClassifiedMove) => (COACHING_ELIGIBLE_CLASSES as ReadonlyArray<string>).includes(m.classification));

  const moves: BatchCoachMovePayload[] = eligibleMoves.map((m: ClassifiedMove) => ({
    ply: m.ply,
    classification: m.classification,
    isUserMove: m.isUserMove,
    move: m.san,
    piece: m.piece,
    from: m.from,
    to: m.to
  }));

  return {
    gameId: result.gameId,
    moves,
    analysisMode: result.analysisMode,
    metadata: {
      depth: String(result.engineConfig.depth),
      threads: String(result.engineConfig.threads),
      timePerMoveMs: String(result.engineConfig.timePerMoveMs),
      analyzedAt: result.analyzedAt,
      playerColor: result.playerColor
    }
  };
}
