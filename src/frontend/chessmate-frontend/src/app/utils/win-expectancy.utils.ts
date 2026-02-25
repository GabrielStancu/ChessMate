import { CLASSIFICATION_THRESHOLDS, MoveClassification, MoveContext, PIECE_VALUES } from '../models/classification.models';

/**
 * Lichess-style sigmoid conversion from centipawns to win expectancy (0–100%).
 * Formula: WE = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 */
export function centipawnToWinExpectancy(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/**
 * Classify a move using Chess.com-inspired Expected Points heuristics.
 *
 * Classification order:
 *   Book → Blunder → Miss → Mistake → Inaccuracy →
 *   Brilliant → Great → Best → Excellent → Good
 *
 * @param weBefore      WE from the moving side's perspective BEFORE the move
 * @param weAfter       WE from the moving side's perspective AFTER the move
 * @param isBestMove    Whether the move matches the engine's top recommendation
 * @param isBookMove    Whether the position is in the opening book
 * @param context       Additional move data for sacrifice / swing detection
 */
export function classifyMove(
  weBefore: number,
  weAfter: number,
  isBestMove: boolean,
  isBookMove: boolean,
  context: MoveContext
): MoveClassification {
  if (isBookMove) {
    return 'Book';
  }

  const weLoss = weBefore - weAfter;
  const cpLoss = context.cpMovingSideBefore - context.cpMovingSideAfter;

  // --- Bad moves (worst first) ---
  if (weLoss >= CLASSIFICATION_THRESHOLDS.blunder) {
    return 'Blunder';
  }

  // Miss: tactical opportunity overlooked — high WE loss with a large centipawn swing
  if (weLoss >= CLASSIFICATION_THRESHOLDS.miss && cpLoss >= 200) {
    return 'Miss';
  }

  if (weLoss >= CLASSIFICATION_THRESHOLDS.mistake) {
    return 'Mistake';
  }

  if (weLoss >= CLASSIFICATION_THRESHOLDS.inaccuracy) {
    return 'Inaccuracy';
  }

  // --- Good moves ---

  // Brilliant: best/near-best move involving a material sacrifice, not too early
  if (isBestMove && weLoss <= 0.5 && context.ply > 8) {
    const isSacrificeCapture =
      context.captured != null &&
      PIECE_VALUES[context.piece] > PIECE_VALUES[context.captured];

    if (isSacrificeCapture) {
      return 'Brilliant';
    }
  }

  // Great: best move that creates a critical eval swing
  if (isBestMove) {
    const cpBefore = context.cpMovingSideBefore;
    const cpAfter = context.cpMovingSideAfter;

    // Recovery: position was losing, now recovered significantly
    const isRecovery = cpBefore <= -150 && cpAfter >= cpBefore + 100;

    // Seize advantage: roughly equal position, found a decisive tactic
    const isSeize = cpBefore >= -50 && cpBefore <= 100 && cpAfter >= cpBefore + 150;

    if (isRecovery || isSeize) {
      return 'Great';
    }
  }

  // Best: the engine's top recommendation
  if (isBestMove) {
    return 'Best';
  }

  // Excellent: very close to the best move
  if (weLoss < CLASSIFICATION_THRESHOLDS.excellent) {
    return 'Excellent';
  }

  // Good: solid move, not optimal but no real damage
  return 'Good';
}

/**
 * Flip win expectancy to the opponent's perspective.
 * If White has 65% WE, Black has 35%.
 */
export function flipWinExpectancy(we: number): number {
  return 100 - we;
}
