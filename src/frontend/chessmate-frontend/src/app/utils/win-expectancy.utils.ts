import { CLASSIFICATION_THRESHOLDS, MoveClassification, MoveContext, PIECE_VALUES } from '../models/classification.models';

/**
 * Lichess-style sigmoid conversion from centipawns to win expectancy (0–100%).
 * Formula: WE = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 */
export function centipawnToWinExpectancy(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/**
 * Resolve 2nd-best centipawn, converting mate scores to large CP values.
 */
function resolveSecondBestCp(context: MoveContext): number {
  if (context.secondBestMate !== null) {
    return context.secondBestMate > 0 ? 10_000 : -10_000;
  }
  return context.secondBestCentipawn ?? 0;
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

  // Forced: only one legal move — no choice regardless of quality
  if (context.legalMoveCount === 1) {
    return 'Forced';
  }

  const weLoss = weBefore - weAfter;
  const cpLoss = context.cpMovingSideBefore - context.cpMovingSideAfter;

  // A move within 10cp of the engine's best line is "near-best".
  // This widens Best/Great reach so solid moves aren't stuck in Good.
  const isNearBest = cpLoss <= CLASSIFICATION_THRESHOLDS.nearBestCp;

  // --- Bad moves (CP-based thresholds, worst first) ---
  // Skip when the move IS the engine's top recommendation — the absolute CP loss
  // may still be high in already-lost positions, but the move is objectively best.
  if (!isBestMove) {
    if (cpLoss >= CLASSIFICATION_THRESHOLDS.blunderCp) {
      return 'Blunder';
    }

    if (cpLoss >= CLASSIFICATION_THRESHOLDS.missCp) {
      return 'Miss';
    }

    if (cpLoss >= CLASSIFICATION_THRESHOLDS.mistakeCp) {
      return 'Mistake';
    }

    if (cpLoss >= CLASSIFICATION_THRESHOLDS.inaccuracyCp) {
      return 'Inaccuracy';
    }
  }

  // --- Good moves ---

  // Brilliant: the engine's #1 move involving a true material sacrifice.
  // Must be a non-pawn piece, past the opening, with SEE-validated sacrifice,
  // and the move itself must be near-optimal (cpLoss ≤ 10).
  if (isBestMove && isNearBest && context.ply > 8 && context.isSacrifice && context.piece !== 'p') {
    return 'Brilliant';
  }

  // Great: best or near-best move where the played move is the only one
  // keeping/obtaining the advantage. Best must cross the winning/losing
  // boundary vs 2nd-best, gap ≥ 200cp.
  const isNearBestForGreat = cpLoss <= CLASSIFICATION_THRESHOLDS.nearBestCpGreat;
  if ((isBestMove || isNearBestForGreat) && context.secondBestCentipawn !== null) {
    const bestCp = context.cpMovingSideAfter;
    const secondBestCp = resolveSecondBestCp(context);
    const gap = Math.abs(bestCp - secondBestCp);
    const crossesBoundary = (bestCp > 0 && secondBestCp < 0) || (bestCp < 0 && secondBestCp > 0);

    if (crossesBoundary && gap >= 200) {
      return 'Great';
    }
  }

  // Best: the engine's top recommendation OR within 10cp of best
  if (isBestMove || isNearBest) {
    return 'Best';
  }

  // Excellent: very close to the best move (WE-based sensitivity)
  if (weLoss < CLASSIFICATION_THRESHOLDS.excellentWe) {
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
