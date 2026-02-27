import { ClassifiedMove } from '../models/classification.models';

/**
 * Maximum absolute centipawn value used for clamping and display mapping.
 * Represents ±10 pawns.
 */
export const EVAL_CLAMP_CP = 1000;

/**
 * Mate score constant in centipawns.
 */
const MATE_CP = 10_000;

/**
 * Clamp a centipawn value to the display range [-EVAL_CLAMP_CP, +EVAL_CLAMP_CP].
 */
export function clampCentipawn(cp: number): number {
  if (cp >= MATE_CP) {
    return EVAL_CLAMP_CP;
  }

  if (cp <= -MATE_CP) {
    return -EVAL_CLAMP_CP;
  }

  return Math.max(-EVAL_CLAMP_CP, Math.min(EVAL_CLAMP_CP, cp));
}

/**
 * Convert a side-to-move centipawn score to White-relative.
 *
 * Stockfish evaluates from the side-to-move's perspective.
 * After ply i: if i is even (White to move) the score is already White-relative;
 * if i is odd (Black to move) we negate to get White-relative.
 *
 * @param cp   Raw centipawn score from Stockfish (side-to-move perspective)
 * @param ply  0-based position index (0 = initial position, 1 = after first move, …)
 */
export function toWhiteRelativeCp(cp: number, positionIndex: number): number {
  const isWhiteToMove = positionIndex % 2 === 0;
  return isWhiteToMove ? cp : -cp;
}

/**
 * Build a White-relative, clamped centipawn timeline from classified moves.
 *
 * Returns an array of length `classifiedMoves.length + 1`:
 *   - Index 0: score at the initial position (before move 1)
 *   - Index i: score after ply i
 *
 * The `centipawnBefore` and `centipawnAfter` fields on ClassifiedMove are raw
 * Stockfish side-to-move scores. We normalize them to White-relative here.
 */
export function buildEvaluationTimeline(classifiedMoves: ClassifiedMove[]): number[] {
  if (classifiedMoves.length === 0) {
    return [0];
  }

  const timeline: number[] = new Array<number>(classifiedMoves.length + 1);

  // Position 0: use centipawnBefore of the first move.
  // Position 0 is the initial position where White is to move (positionIndex = 0).
  timeline[0] = clampCentipawn(
    toWhiteRelativeCp(classifiedMoves[0].centipawnBefore ?? 0, 0)
  );

  for (let i = 0; i < classifiedMoves.length; i++) {
    const move = classifiedMoves[i];
    const positionIndexAfter = i + 1;
    const rawCp = move.centipawnAfter ?? 0;
    timeline[positionIndexAfter] = clampCentipawn(
      toWhiteRelativeCp(rawCp, positionIndexAfter)
    );
  }

  return timeline;
}

/**
 * Format a White-relative centipawn score for display.
 *
 * Examples: "+1.5", "−0.3", "0.0", "+10.0" (clamped mate).
 */
export function formatEvalDisplay(cpWhiteRelative: number): string {
  const clamped = clampCentipawn(cpWhiteRelative);
  const pawns = clamped / 100;

  if (pawns > 0) {
    return `+${pawns.toFixed(1)}`;
  }

  if (pawns < 0) {
    return `${pawns.toFixed(1)}`;
  }

  return '0.0';
}

/**
 * Convert a White-relative centipawn score to a fill percentage for the evaluation bar.
 *
 * Returns a value 0–100 representing how much of the bar should be filled white.
 * 0 cp → 50%, +1000 cp → 100%, −1000 cp → 0%.
 * Uses a linear mapping within the clamped range.
 */
export function evalToBarPercent(cpWhiteRelative: number): number {
  const clamped = clampCentipawn(cpWhiteRelative);
  return 50 + (clamped / EVAL_CLAMP_CP) * 50;
}
