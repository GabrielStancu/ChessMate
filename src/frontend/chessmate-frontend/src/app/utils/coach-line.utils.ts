import { Chess, Square } from 'chess.js';
import { CoachLine, CoachLineStep, PIECE_VALUES } from '../models/classification.models';

const MAX_HALF_MOVES = 10;

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'
};

function pieceName(p: string): string {
  return PIECE_NAMES[p.toLowerCase()] ?? 'piece';
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

interface MotifResult {
  type: 'capture' | 'fork' | 'pin' | 'check' | 'checkmate' | 'skewer';
  description: string;
}

function detectSignificantMotif(board: Chess, san: string, from: string, to: string, piece: string): MotifResult | null {
  const isCheckmate = san.includes('#');
  if (isCheckmate) {
    return { type: 'checkmate', description: `${san} delivers checkmate` };
  }

  const isCheck = san.includes('+');
  if (isCheck) {
    return { type: 'check', description: `${san} gives check with the ${pieceName(piece)}` };
  }

  const isCapture = san.includes('x');
  if (isCapture) {
    const capturedPiece = board.get(to as Square);
    if (!capturedPiece) {
      return { type: 'capture', description: `${san} wins material` };
    }

    const movingValue = PIECE_VALUES[piece] ?? 0;
    const capturedValue = PIECE_VALUES[capturedPiece.type] ?? 0;

    // Only flag non-exchange captures (winning material, not equal trades)
    if (capturedValue > movingValue || (capturedValue >= 3 && capturedValue === movingValue && piece === 'p')) {
      return {
        type: 'capture',
        description: `${san} wins the ${pieceName(capturedPiece.type)}`
      };
    }

    // Skip equal exchanges — not significant enough
    if (capturedValue === movingValue) {
      return null;
    }

    // Capturing a lesser piece with a greater one — check if it's at least a significant gain
    if (capturedValue >= 3) {
      return {
        type: 'capture',
        description: `${san} captures the ${pieceName(capturedPiece.type)}`
      };
    }
  }

  // Fork detection
  const sq = to as Square;
  const placedPiece = board.get(sq);
  if (placedPiece) {
    const attacked: string[] = [];
    const moves = board.moves({ verbose: true });
    for (const m of moves) {
      if (m.from !== sq) continue;
      const target = board.get(m.to as Square);
      if (target && target.color !== placedPiece.color) {
        if (target.type === 'k') {
          if (!attacked.includes('king')) attacked.push('king');
        } else if ((PIECE_VALUES[target.type] ?? 0) >= 3) {
          const name = pieceName(target.type);
          if (!attacked.includes(name)) attacked.push(name);
        }
      }
    }
    if (attacked.length >= 2) {
      return {
        type: 'fork',
        description: `${san} forks the ${attacked.join(' and ')}`
      };
    }
  }

  // Pin detection
  if (placedPiece && (placedPiece.type === 'b' || placedPiece.type === 'r' || placedPiece.type === 'q')) {
    const pin = detectPinMotif(board, sq, placedPiece);
    if (pin) {
      return { type: 'pin', description: `${san} ${pin}` };
    }

    const skewer = detectSkewerMotif(board, sq, placedPiece);
    if (skewer) {
      return { type: 'skewer', description: `${san} ${skewer}` };
    }
  }

  return null;
}

function detectPinMotif(board: Chess, sq: Square, piece: { type: string; color: string }): string | null {
  const opponentColor = piece.color === 'w' ? 'b' : 'w';
  const rays = getRays(sq, piece.type);
  for (const ray of rays) {
    let firstPiece: { type: string; sq: Square } | null = null;
    let secondPiece: { type: string; sq: Square } | null = null;
    for (const rs of ray) {
      const occupant = board.get(rs);
      if (!occupant) continue;
      if (!firstPiece) { firstPiece = { type: occupant.type, sq: rs }; continue; }
      secondPiece = { type: occupant.type, sq: rs };
      break;
    }
    if (firstPiece && secondPiece) {
      const fp = board.get(firstPiece.sq);
      const sp = board.get(secondPiece.sq);
      if (fp && sp && fp.color === opponentColor && sp.color === opponentColor) {
        if (sp.type === 'k' || (PIECE_VALUES[sp.type] ?? 0) > (PIECE_VALUES[fp.type] ?? 0)) {
          return `pins the ${pieceName(fp.type)} to the ${pieceName(sp.type)}`;
        }
      }
    }
  }
  return null;
}

function detectSkewerMotif(board: Chess, sq: Square, piece: { type: string; color: string }): string | null {
  const opponentColor = piece.color === 'w' ? 'b' : 'w';
  const rays = getRays(sq, piece.type);
  for (const ray of rays) {
    let firstPiece: { type: string; sq: Square } | null = null;
    let secondPiece: { type: string; sq: Square } | null = null;
    for (const rs of ray) {
      const occupant = board.get(rs);
      if (!occupant) continue;
      if (!firstPiece) { firstPiece = { type: occupant.type, sq: rs }; continue; }
      secondPiece = { type: occupant.type, sq: rs };
      break;
    }
    if (firstPiece && secondPiece) {
      const fp = board.get(firstPiece.sq);
      const sp = board.get(secondPiece.sq);
      if (fp && sp && fp.color === opponentColor && sp.color === opponentColor) {
        if ((PIECE_VALUES[fp.type] ?? 0) > (PIECE_VALUES[sp.type] ?? 0) || fp.type === 'k') {
          return `skewers the ${pieceName(fp.type)} with the ${pieceName(sp.type)} behind`;
        }
      }
    }
  }
  return null;
}

function getRays(square: Square, pieceType: string): Square[][] {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10);
  const straights: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const diagonals: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const dirs = pieceType === 'b' ? diagonals : pieceType === 'r' ? straights : [...straights, ...diagonals];

  return dirs.map(([df, dr]) => {
    const ray: Square[] = [];
    for (let i = 1; i < 8; i++) {
      const f = file + df * i;
      const r = rank + dr * i;
      if (f < 0 || f > 7 || r < 1 || r > 8) break;
      ray.push(`${String.fromCharCode('a'.charCodeAt(0) + f)}${r}` as Square);
    }
    return ray;
  });
}

/**
 * Build a coach continuation line from a given position, playing the best move
 * for each side (alternating) up to MAX_HALF_MOVES (10 = 5 per side).
 *
 * Uses chess.js for move legality — no engine needed. The "best move" for
 * the first ply comes from the engine's bestMove/opponentBestResponse
 * stored in the ClassifiedMove. Subsequent moves are approximated using
 * a simple heuristic (captures > checks > central moves).
 *
 * Stops early when a significant tactical motif is detected.
 */
export function buildCoachLine(
  fenAfterMistake: string,
  bestMoveUci: string | null,
  opponentBestResponseUci: string | null
): CoachLine | null {
  if (!bestMoveUci) return null;

  const steps: CoachLineStep[] = [];
  let board: Chess;

  try {
    board = new Chess(fenAfterMistake);
  } catch {
    return null;
  }

  // Queue of known engine moves: bestMove is for the side-to-move BEFORE the mistake,
  // i.e., the opponent's best response to the mistake played.
  // opponentBestResponse is the response to that.
  const knownMoves: (string | null)[] = [bestMoveUci, opponentBestResponseUci];

  for (let i = 0; i < MAX_HALF_MOVES; i++) {
    let uci: string | null = null;
    let applied: ReturnType<Chess['move']> | null = null;

    // Try known engine move first
    if (i < knownMoves.length && knownMoves[i]) {
      uci = knownMoves[i]!;
      try {
        applied = board.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length === 5 ? uci[4] : undefined
        });
      } catch {
        applied = null;
      }
    }

    // Fallback: pick a heuristic "best" move
    if (!applied) {
      const fallback = pickHeuristicBestMove(board);
      if (!fallback) break;
      uci = `${fallback.from}${fallback.to}${fallback.promotion ?? ''}`;
      applied = fallback;
    }

    const fenAfter = board.fen();
    steps.push({
      san: applied.san,
      uci: uci!,
      fenAfter
    });

    // Only stop on the opponent's moves (even indices: 0 = first opponent response, 2, 4...).
    // Odd indices are the blunderer's replies — we keep going through those.
    if (i % 2 === 0) {
      const motif = detectSignificantMotif(board, applied.san, applied.from, applied.to, applied.piece);
      if (motif) {
        return { steps, motifDescription: motif.description, motifType: motif.type };
      }
    }

    // If the game is over (checkmate or stalemate detected by chess.js)
    if (board.isGameOver()) {
      if (board.isCheckmate()) {
        return {
          steps,
          motifDescription: `${applied.san} delivers checkmate`,
          motifType: 'checkmate'
        };
      }
      break;
    }
  }

  // No significant motif found within MAX_HALF_MOVES
  return null;
}

/**
 * Simple heuristic move picker (no engine).
 * Priority: checkmates > checks > captures sorted by MVV-LVA > central piece moves.
 */
function pickHeuristicBestMove(board: Chess): ReturnType<Chess['move']> | null {
  const legalMoves = board.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  // Sort by priority
  const scored = legalMoves.map(m => {
    let score = 0;

    // Try the move to check for checkmate/check
    const testBoard = new Chess(board.fen());
    const testApplied = testBoard.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
    if (testApplied) {
      if (testBoard.isCheckmate()) score += 10000;
      else if (testBoard.isCheck()) score += 500;
    }

    // Captures: MVV-LVA
    if (m.captured) {
      const victimValue = PIECE_VALUES[m.captured] ?? 0;
      const attackerValue = PIECE_VALUES[m.piece] ?? 0;
      score += 1000 + victimValue * 10 - attackerValue;
    }

    // Central squares
    const toFile = m.to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRank = parseInt(m.to[1], 10);
    const centerDist = Math.abs(toFile - 3.5) + Math.abs(toRank - 4.5);
    score += Math.max(0, 4 - centerDist);

    return { move: m, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0].move;
  try {
    return board.move({ from: best.from, to: best.to, promotion: best.promotion || undefined });
  } catch {
    return null;
  }
}
