import { ClassifiedMove, COACHING_ELIGIBLE_CLASSES, FullGameAnalysisResult } from './classification.models';
import { EngineConfig } from './analysis.models';

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
  fenBefore: string | null;
  fenAfter: string | null;
  centipawnBefore: number | null;
  centipawnAfter: number | null;
  centipawnLoss: number | null;
  bestMove: string | null;
  opponentBestResponse: string | null;
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

// ---------------------------------------------------------------------------
// Response types — mirror backend BatchCoachResponseEnvelope hierarchy
// ---------------------------------------------------------------------------

export interface BatchCoachResponseEnvelope {
  schemaVersion: string;
  operationId: string;
  summary: BatchCoachSummaryEnvelope;
  coaching: BatchCoachCoachingItemEnvelope[];
  metadata: BatchCoachMetadataEnvelope;
}

export interface BatchCoachSummaryEnvelope {
  gameId: string;
  totalMoves: number;
  eligibleMoves: number;
  analysisMode: string;
}

export interface BatchCoachCoachingItemEnvelope {
  ply: number;
  classification: string;
  isUserMove: boolean;
  move: string;
  explanation: string;
}

export interface BatchCoachMetadataEnvelope {
  completedAtUtc: string;
  eligibleClassifications: string[];
  warnings: BatchCoachWarningEnvelope[] | null;
  failureCode: string | null;
}

export interface BatchCoachWarningEnvelope {
  ply: number;
  classification: string;
  move: string | null;
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a batch-coach API request payload from a full-game analysis result.
 * Only coaching-eligible moves (Inaccuracy, Mistake, Miss, Blunder) are included.
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
    to: m.to,
    fenBefore: m.fenBefore,
    fenAfter: m.fenAfter,
    centipawnBefore: m.centipawnBefore,
    centipawnAfter: m.centipawnAfter,
    centipawnLoss: m.centipawnLoss,
    bestMove: m.bestMove,
    opponentBestResponse: m.opponentBestResponse
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

/**
 * Build a ply-keyed lookup map for O(1) coaching retrieval during navigation.
 */
export function buildCoachingLookup(
  response: BatchCoachResponseEnvelope | null
): Map<number, BatchCoachCoachingItemEnvelope> {
  const map = new Map<number, BatchCoachCoachingItemEnvelope>();
  if (!response) {
    return map;
  }

  for (const item of response.coaching) {
    map.set(item.ply, item);
  }

  return map;
}

/**
 * Generate a deterministic idempotency key from game + engine context.
 * Format: `{gameId}:{analysisMode}:{depth}:{threads}:{timePerMoveMs}:{timestamp-minutes}`
 * The timestamp is floored to the nearest 10-minute window to allow reasonable retries.
 */
export function generateIdempotencyKey(
  gameId: string,
  analysisMode: string,
  config: EngineConfig
): string {
  const windowMinutes = Math.floor(Date.now() / (10 * 60 * 1000));
  return `${gameId}:${analysisMode}:${config.depth}:${config.threads}:${config.timePerMoveMs}:${windowMinutes}`;
}
