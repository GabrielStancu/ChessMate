import { Chess, Move, Square } from 'chess.js';
import { ClassifiedMove, PIECE_VALUES } from '../models/classification.models';

// ── Vocabulary ──────────────────────────────────────────────────────────────────

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'
};

function pieceName(p: string): string { return PIECE_NAMES[p.toLowerCase()] ?? 'piece'; }
function capitalize(s: string): string { return s ? s[0].toUpperCase() + s.slice(1) : s; }

// ── Deterministic variety ───────────────────────────────────────────────────────
// Pick a variant based on ply so the same game always produces the same text,
// but consecutive moves get different phrasing.

function pick(ply: number, variants: string[]): string {
  return variants[ply % variants.length];
}

// ── UCI → SAN helper ────────────────────────────────────────────────────────────

function uciToSan(fen: string, uci: string): string | null {
  if (!uci || uci.length < 4) return null;
  try {
    const b = new Chess(fen);
    const applied = b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length === 5 ? uci[4] : undefined });
    return applied?.san ?? null;
  } catch { return null; }
}

// ── Board utility helpers ───────────────────────────────────────────────────────

function allSquares(): Square[] {
  const sqs: Square[] = [];
  for (const f of 'abcdefgh') for (const r of '12345678') sqs.push(`${f}${r}` as Square);
  return sqs;
}

/**
 * Determine whether a capture truly "gives up" material.
 * A sacrifice occurs when the captured piece is worth less than the capturing
 * piece AND the capturing piece can be recaptured without friendly support.
 */
function isTrueSacrificeCapture(
  boardAfter: Chess,
  toSquare: Square,
  movingColor: 'w' | 'b',
  movedValue: number,
  capturedValue: number
): boolean {
  if (capturedValue >= movedValue) return false;
  const opponentColor = movingColor === 'w' ? 'b' : 'w';
  const isRecapturable = boardAfter.isAttacked(toSquare, opponentColor);
  const isDefended = boardAfter.isAttacked(toSquare, movingColor);
  return isRecapturable && !isDefended;
}

// ── Tactical motif detection ────────────────────────────────────────────────────

interface ForkResult { targets: string[]; text: string; }

function detectFork(board: Chess, move: ClassifiedMove): ForkResult | null {
  const sq = move.to as Square;
  const piece = board.get(sq);
  if (!piece) return null;

  const attacked: { name: string; value: number }[] = [];
  const moves = board.moves({ verbose: true });
  for (const m of moves) {
    if (m.from !== sq) continue;
    const target = board.get(m.to as Square);
    if (target && target.color !== piece.color && (PIECE_VALUES[target.type] ?? 0) >= 3) {
      attacked.push({ name: pieceName(target.type), value: PIECE_VALUES[target.type] ?? 0 });
    }
  }
  // Include king attacks (king has value 0 in PIECE_VALUES but is extremely valuable as a target)
  for (const m of moves) {
    if (m.from !== sq) continue;
    const target = board.get(m.to as Square);
    if (target && target.color !== piece.color && target.type === 'k') {
      if (!attacked.some(a => a.name === 'king')) {
        attacked.push({ name: 'king', value: 100 });
      }
    }
  }

  if (attacked.length < 2) return null;
  // Sort by value descending so the most important targets appear first
  attacked.sort((a, b) => b.value - a.value);
  const names = attacked.map(a => a.name);
  const text = names.length === 2
    ? `${capitalize(pieceName(piece.type))} forks the ${names[0]} and ${names[1]}`
    : `${capitalize(pieceName(piece.type))} forks ${names.join(', ')}`;
  return { targets: names, text };
}

function detectPin(boardAfter: Chess, move: ClassifiedMove): string | null {
  const sq = move.to as Square;
  const piece = boardAfter.get(sq);
  if (!piece) return null;
  if (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') return null;

  const opponentColor = piece.color === 'w' ? 'b' : 'w';
  // Look for opponent pieces that can no longer move because doing so would
  // expose their king. A simplified heuristic: find opponent pieces between
  // this piece and the opponent king along the attack ray.
  const rays = getRays(sq, piece.type);
  for (const ray of rays) {
    let firstPiece: { type: string; sq: Square } | null = null;
    let secondPiece: { type: string; sq: Square } | null = null;
    for (const rs of ray) {
      const occupant = boardAfter.get(rs);
      if (!occupant) continue;
      if (!firstPiece) { firstPiece = { type: occupant.type, sq: rs }; continue; }
      secondPiece = { type: occupant.type, sq: rs };
      break;
    }
    if (firstPiece && secondPiece) {
      const fp = boardAfter.get(firstPiece.sq);
      const sp = boardAfter.get(secondPiece.sq);
      if (fp && sp && fp.color === opponentColor && sp.color === opponentColor) {
        if (sp.type === 'k' || (PIECE_VALUES[sp.type] ?? 0) > (PIECE_VALUES[fp.type] ?? 0)) {
          return `Pinning the ${pieceName(fp.type)} to the ${pieceName(sp.type)}`;
        }
      }
    }
  }
  return null;
}

function detectSkewer(boardAfter: Chess, move: ClassifiedMove): string | null {
  const sq = move.to as Square;
  const piece = boardAfter.get(sq);
  if (!piece) return null;
  if (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') return null;

  const opponentColor = piece.color === 'w' ? 'b' : 'w';
  const rays = getRays(sq, piece.type);
  for (const ray of rays) {
    let firstPiece: { type: string; sq: Square } | null = null;
    let secondPiece: { type: string; sq: Square } | null = null;
    for (const rs of ray) {
      const occupant = boardAfter.get(rs);
      if (!occupant) continue;
      if (!firstPiece) { firstPiece = { type: occupant.type, sq: rs }; continue; }
      secondPiece = { type: occupant.type, sq: rs };
      break;
    }
    if (firstPiece && secondPiece) {
      const fp = boardAfter.get(firstPiece.sq);
      const sp = boardAfter.get(secondPiece.sq);
      if (fp && sp && fp.color === opponentColor && sp.color === opponentColor) {
        // Skewer: first piece is MORE valuable — it must move, exposing the second
        if ((PIECE_VALUES[fp.type] ?? 0) > (PIECE_VALUES[sp.type] ?? 0) || fp.type === 'k') {
          return `Skewering the ${pieceName(fp.type)} — the ${pieceName(sp.type)} behind it is exposed`;
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

function detectDiscoveredAttack(boardBefore: Chess, boardAfter: Chess, move: ClassifiedMove): string | null {
  const movingColor = move.ply % 2 === 1 ? 'w' : 'b';
  const opponentColor = movingColor === 'w' ? 'b' : 'w';
  const fromSq = move.from as Square;
  const sqs = allSquares();
  for (const sq of sqs) {
    const target = boardAfter.get(sq);
    if (!target || target.color !== opponentColor || target.type === 'p') continue;
    const wasAttacked = boardBefore.isAttacked(sq, movingColor);
    const nowAttacked = boardAfter.isAttacked(sq, movingColor);
    if (!wasAttacked && nowAttacked) {
      // Find which friendly sliding piece is now attacking the target
      if (areOnSameRay(fromSq, sq)) {
        // Walk the ray from fromSq toward sq to identify the unmasked attacker
        const file = fromSq.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = parseInt(fromSq[1], 10);
        const tFile = sq.charCodeAt(0) - 'a'.charCodeAt(0);
        const tRank = parseInt(sq[1], 10);
        const df = Math.sign(tFile - file);
        const dr = Math.sign(tRank - rank);
        let attackerName = 'piece';
        let attackerSq = '';
        for (let i = 1; i < 8; i++) {
          const f = file + df * i;
          const r = rank + dr * i;
          if (f < 0 || f > 7 || r < 1 || r > 8) break;
          const candidate = `${String.fromCharCode('a'.charCodeAt(0) + f)}${r}` as Square;
          if (candidate === (move.to as Square)) continue; // skip moved piece's new square
          const p = boardAfter.get(candidate);
          if (p && p.color === movingColor) {
            attackerName = pieceName(p.type);
            attackerSq = candidate;
            break;
          }
          if (p) break; // blocked by opponent piece before we found a friendly
        }
        return `Moving the ${pieceName(move.piece)} creates a discovered attack from your ${attackerName}, which now threatens the ${pieceName(target.type)} on ${sq}`;
      }
    }
  }
  return null;
}

function areOnSameRay(sq1: Square, sq2: Square): boolean {
  const f1 = sq1.charCodeAt(0) - 'a'.charCodeAt(0), r1 = parseInt(sq1[1], 10);
  const f2 = sq2.charCodeAt(0) - 'a'.charCodeAt(0), r2 = parseInt(sq2[1], 10);
  const df = f2 - f1, dr = r2 - r1;
  if (df === 0 || dr === 0) return true; // same file or rank
  return Math.abs(df) === Math.abs(dr);  // same diagonal
}

function detectHangingPieces(board: Chess, movingColor: 'w' | 'b', excludeSquare?: Square): { name: string; square: Square }[] {
  const opponentColor = movingColor === 'w' ? 'b' : 'w';
  const hanging: { name: string; square: Square }[] = [];
  for (const sq of allSquares()) {
    if (excludeSquare && sq === excludeSquare) continue;
    const piece = board.get(sq);
    if (!piece || piece.color !== movingColor || piece.type === 'k') continue;
    if (!board.isAttacked(sq, opponentColor)) continue;
    if (!board.isAttacked(sq, movingColor)) {
      hanging.push({ name: pieceName(piece.type), square: sq });
    }
  }
  hanging.sort((a, b) => {
    const pA = board.get(a.square);
    const pB = board.get(b.square);
    return (PIECE_VALUES[pB?.type ?? 'p'] ?? 0) - (PIECE_VALUES[pA?.type ?? 'p'] ?? 0);
  });
  return hanging;
}

function detectDevelopment(move: ClassifiedMove, ply: number, isUser: boolean): string | null {
  if (ply > 20) return null;
  const piece = move.piece;
  if (piece === 'p' || piece === 'k' || piece === 'q') return null;
  const color = ply % 2 === 1 ? 'w' : 'b';
  const rank = move.from[1];
  const isStartRank = (color === 'w' && rank === '1') || (color === 'b' && rank === '8');
  if (!isStartRank) return null;
  return isUser
    ? pick(ply, [
        `You develop the ${pieceName(piece)} to ${move.to}`,
        `Good habit: developing the ${pieceName(piece)} early. ${capitalize(pieceName(piece))} to ${move.to}`,
        `You bring the ${pieceName(piece)} into the game on ${move.to}`
      ])
    : pick(ply, [
        `Your opponent develops the ${pieceName(piece)} to ${move.to}`,
        `Opponent brings the ${pieceName(piece)} into play on ${move.to}`,
        `The ${pieceName(piece)} comes to ${move.to} for your opponent`
      ]);
}

function detectPassedPawn(board: Chess, square: Square, color: string): boolean {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10);
  const dir = color === 'w' ? 1 : -1;
  const opp = color === 'w' ? 'b' : 'w';
  for (const f of [file - 1, file, file + 1]) {
    if (f < 0 || f > 7) continue;
    const fc = String.fromCharCode('a'.charCodeAt(0) + f);
    for (let r = rank + dir; r >= 1 && r <= 8; r += dir) {
      const p = board.get(`${fc}${r}` as Square);
      if (p && p.type === 'p' && p.color === opp) return false;
    }
  }
  return true;
}

// ── Positional purpose detection ────────────────────────────────────────────────

const CENTRAL_SQUARES = new Set(['d4', 'd5', 'e4', 'e5']);
const EXTENDED_CENTER = new Set(['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6']);

/** True when the square is on an open file (no pawns of either colour on that file). */
function isOpenFile(board: Chess, square: Square): boolean {
  const file = square[0];
  for (let r = 1; r <= 8; r++) {
    const p = board.get(`${file}${r}` as Square);
    if (p && p.type === 'p') return false;
  }
  return true;
}

/** True when the file has pawns of one colour only (semi-open for the piece's colour). */
function isSemiOpenFile(board: Chess, square: Square, color: 'w' | 'b'): boolean {
  const file = square[0];
  let ownPawn = false;
  let oppPawn = false;
  for (let r = 1; r <= 8; r++) {
    const p = board.get(`${file}${r}` as Square);
    if (!p || p.type !== 'p') continue;
    if (p.color === color) ownPawn = true; else oppPawn = true;
  }
  return !ownPawn && oppPawn;
}

/** True when the square cannot be attacked by an enemy pawn. */
function isOutpostSquare(board: Chess, square: Square, color: 'w' | 'b'): boolean {
  const opp = color === 'w' ? 'b' : 'w';
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10);
  const dir = opp === 'w' ? 1 : -1;
  for (const df of [-1, 1]) {
    for (let dr = 1; dr < 8; dr++) {
      const f = file + df;
      const r = rank + dir * dr;
      if (f < 0 || f > 7 || r < 1 || r > 8) break;
      const p = board.get(`${String.fromCharCode('a'.charCodeAt(0) + f)}${r}` as Square);
      if (p && p.type === 'p' && p.color === opp) return false;
    }
  }
  return true;
}

/** True when all four rooks (own + opponent) cover the given file. */
function isConnectedRooks(board: Chess, square: Square, color: 'w' | 'b'): boolean {
  const file = square[0];
  const rooks: Square[] = [];
  for (let r = 1; r <= 8; r++) {
    const p = board.get(`${file}${r}` as Square);
    if (p && p.type === 'r' && p.color === color) rooks.push(`${file}${r}` as Square);
  }
  return rooks.length >= 2;
}

/**
 * Returns a short description of the positional purpose of a non-capture, non-tactical move,
 * for use both in "good move" praise and as context in bad-move criticism.
 */
function detectPositionalPurpose(
  boardBefore: Chess,
  boardAfter: Chess,
  move: ClassifiedMove,
  movingColor: 'w' | 'b',
  ply: number,
  isUser: boolean
): string | null {
  const piece = move.piece;
  const toSq = move.to as Square;
  const fromSq = move.from as Square;
  const toFile = toSq[0];
  const toRank = parseInt(toSq[1], 10);
  const name = pieceName(piece);
  const from = fromSq;
  const to = toSq;
  const opponentColor: 'w' | 'b' = movingColor === 'w' ? 'b' : 'w';

  // 1. Rook to open file
  if (piece === 'r' && isOpenFile(boardAfter, to)) {
    return isUser
      ? pick(ply, [
          `You place the rook on an open file — it has no pawns blocking its path and maximum range.`,
          `The rook lands on the open ${toFile}-file. Open files are highways for rooks.`,
          `Your rook seizes the open ${toFile}-file, putting immediate pressure down the board.`
        ])
      : pick(ply, [
          `Your opponent's rook occupies an open file, gaining long-term pressure along the ${toFile}-file.`,
          `The rook claims the open ${toFile}-file. Expect activity from there.`
        ]);
  }

  // 2. Rook to semi-open file
  if (piece === 'r' && isSemiOpenFile(boardAfter, to, movingColor)) {
    return isUser
      ? pick(ply, [
          `The rook moves to the semi-open ${toFile}-file, targeting the opponent's pawn with no own pawn in the way.`,
          `Your rook eyes the ${toFile}-file — it's clear of your own pawns and bears down on the enemy.`
        ])
      : pick(ply, [
          `Your opponent posts the rook on a semi-open file, putting your pawn under scrutiny.`
        ]);
  }

  // 3. Knight or bishop to outpost
  if ((piece === 'n' || piece === 'b') && EXTENDED_CENTER.has(to) && isOutpostSquare(boardAfter, to, movingColor)) {
    return isUser
      ? pick(ply, [
          `Your ${name} settles on an outpost at ${to} — enemy pawns cannot chase it away from here.`,
          `${capitalize(name)} to ${to}: a strong outpost. Pieces planted on squares that pawns can't attack become long-term threats.`,
          `You anchor the ${name} on ${to}. With no enemy pawn able to dislodge it, this piece can dominate.`
        ])
      : pick(ply, [
          `Your opponent places the ${name} on an outpost at ${to}. It's hard to push away.`,
          `The ${name} finds an outpost at ${to}. Outpost pieces can be very difficult to neutralise.`
        ]);
  }

  // 4. Piece to central square
  if (CENTRAL_SQUARES.has(to)) {
    return isUser
      ? pick(ply, [
          `Your ${name} heads to ${to} — a central square where it controls the most board space.`,
          `Centralising the ${name} on ${to}. Central pieces radiate influence in all directions.`,
          `${capitalize(name)} takes up a commanding central post on ${to}.`
        ])
      : pick(ply, [
          `Your opponent centralises the ${name} on ${to}, increasing its influence across the board.`,
          `The ${name} reaches the centre. Central control is a foundational advantage.`
        ]);
  }

  // 5. Extended-centre piece activity
  if (EXTENDED_CENTER.has(to) && (piece === 'n' || piece === 'b')) {
    return isUser
      ? pick(ply, [
          `You improve the ${name} to ${to}, bringing it closer to the centre of the action.`,
          `${capitalize(name)} to ${to}: a more active square, increasing piece coordination.`
        ])
      : pick(ply, [
          `Your opponent improves the ${name} to ${to}, enhancing its activity.`
        ]);
  }

  // 6. King activity in the endgame
  if (piece === 'k' && ply > 60) {
    return isUser
      ? pick(ply, [
          `The king becomes an attacking piece in the endgame — activating it is often essential.`,
          `Your king steps forward. In the endgame, an active king is a powerful weapon.`
        ])
      : pick(ply, [
          `Your opponent's king advances. Active king play in endgames is often decisive.`
        ]);
  }

  // 7. Piece retreating — improvement
  if (piece !== 'p' && piece !== 'k') {
    const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const toFile2 = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRank = parseInt(from[1], 10);
    const movingTowardsOwn = (movingColor === 'w' && toRank < fromRank) || (movingColor === 'b' && toRank > fromRank);
    if (movingTowardsOwn) {
      return isUser
        ? pick(ply, [
            `You reposition the ${name} to ${to}. Sometimes a step back improves the piece's long-term scope.`,
            `The ${name} retreats to ${to} — regrouping to a better square before re-entering the action.`
          ])
        : pick(ply, [
            `Your opponent regroups the ${name} to ${to}, seeking a better diagonal or file.`
          ]);
    }
  }

  return null;
}

/**
 * Generates a short explanation of WHY a move is bad, based on the resulting position.
 * Supplements the best-move suggestion for Mistake/Blunder/Miss/Inaccuracy.
 */
function detectBadMoveProblem(
  boardBefore: Chess,
  boardAfter: Chess,
  move: ClassifiedMove,
  movingColor: 'w' | 'b',
  ply: number
): string | null {
  const opponentColor: 'w' | 'b' = movingColor === 'w' ? 'b' : 'w';
  const toSq = move.to as Square;
  const fromSq = move.from as Square;
  const name = pieceName(move.piece);

  // A. Moved piece lands on a square attacked by a less valuable piece
  const landingAttackers = boardAfter.moves({ verbose: true })
    .filter(m => m.to === toSq && boardAfter.get(m.from as Square)?.color === opponentColor);
  if (landingAttackers.length > 0) {
    const cheapestAttacker = landingAttackers.reduce((best, m) => {
      const v = PIECE_VALUES[boardAfter.get(m.from as Square)?.type ?? 'p'] ?? 0;
      return v < best ? v : best;
    }, 99);
    const movedValue = PIECE_VALUES[move.piece] ?? 0;
    if (cheapestAttacker < movedValue) {
      const attackerPiece = landingAttackers.find(m => (PIECE_VALUES[boardAfter.get(m.from as Square)?.type ?? 'p'] ?? 0) === cheapestAttacker);
      const attackerName = attackerPiece ? pieceName(boardAfter.get(attackerPiece.from as Square)?.type ?? 'p') : 'a piece';
      return pick(ply, [
        `The ${name} lands on ${toSq} where it can be taken by the ${attackerName} — a less valuable piece wins material.`,
        `After this, your opponent can capture the ${name} on ${toSq} with the ${attackerName} and come out ahead.`,
        `${capitalize(name)} on ${toSq} is immediately under threat from the ${attackerName}.`
      ]);
    }
  }

  // B. Move abandons defence of an attacked friendly piece
  const sqs = allSquares();
  for (const sq of sqs) {
    if (sq === fromSq) continue;
    const p = boardAfter.get(sq);
    if (!p || p.color !== movingColor || p.type === 'k') continue;
    const wasDefended = boardBefore.isAttacked(sq, movingColor);
    const nowDefended = boardAfter.isAttacked(sq, movingColor);
    const isAttacked = boardAfter.isAttacked(sq, opponentColor);
    if (wasDefended && !nowDefended && isAttacked) {
      return pick(ply, [
        `This move stops defending the ${pieceName(p.type)} on ${sq}, which is now left unprotected.`,
        `The ${pieceName(p.type)} on ${sq} loses its defender — it can now be captured for free.`,
        `By moving away, you leave the ${pieceName(p.type)} on ${sq} without support. It's now a target.`
      ]);
    }
  }

  // C. Move opens a file or diagonal toward your own king
  const kingSquare = sqs.find(sq => { const p = boardAfter.get(sq); return p?.type === 'k' && p.color === movingColor; });
  if (kingSquare && areOnSameRay(fromSq, kingSquare as Square)) {
    const kingNowExposed = boardAfter.isAttacked(kingSquare as Square, opponentColor);
    if (kingNowExposed) {
      return pick(ply, [
        `Moving away from ${fromSq} opens a line toward your king — your opponent can now target it directly.`,
        `This creates a dangerous line to your king. The king's safety has been compromised.`
      ]);
    }
  }

  return null;
}

// ── Missed-motif analysis (for bad moves) ───────────────────────────────────────

interface BestMoveMotif {
  san: string;
  fork: ForkResult | null;
  pin: string | null;
  skewer: string | null;
  captureGain: { capturedName: string; value: number } | null;
}

function analyzeBestMove(fenBefore: string, bestUci: string): BestMoveMotif | null {
  if (!bestUci || bestUci.length < 4) return null;
  try {
    const board = new Chess(fenBefore);
    const from = bestUci.slice(0, 2);
    const to = bestUci.slice(2, 4);
    const promo = bestUci.length === 5 ? bestUci[4] : undefined;
    const applied = board.move({ from, to, promotion: promo });
    if (!applied) return null;

    const san = applied.san;
    const boardAfter = board; // board is now in the post-move state
    const dummyMove: ClassifiedMove = {
      ply: 0, san, from, to, piece: applied.piece,
      isUserMove: true, classification: 'Best',
      winExpectancyBefore: 0, winExpectancyAfter: 0, winExpectancyLoss: 0,
      bestMove: null, opponentBestResponse: null,
      centipawnBefore: null, centipawnAfter: null, centipawnLoss: 0,
      fenBefore, fenAfter: boardAfter.fen()
    };

    const fork = detectFork(boardAfter, dummyMove);
    const pin = detectPin(boardAfter, dummyMove);
    const skewer = detectSkewer(boardAfter, dummyMove);
    let captureGain: { capturedName: string; value: number } | null = null;
    if (applied.captured) {
      captureGain = { capturedName: pieceName(applied.captured), value: PIECE_VALUES[applied.captured] ?? 0 };
    }
    return { san, fork, pin, skewer, captureGain };
  } catch { return null; }
}

function buildMissedMotifText(motif: BestMoveMotif, ply: number, isUser: boolean): string | null {
  if (motif.fork) {
    const forkPart = motif.captureGain
      ? `${motif.san} would have captured the ${motif.captureGain.capturedName} and forked the ${motif.fork.targets.join(' and ')}`
      : `${motif.san} would have forked the ${motif.fork.targets.join(' and ')}`;
    return isUser
      ? pick(ply, [
          `${forkPart}. Worth keeping an eye on double attacks.`,
          `There was a fork available: ${forkPart}.`,
          `${motif.san} set up a fork on the ${motif.fork.targets.join(' and ')}. These patterns come with practice.`
        ])
      : pick(ply, [
          `Your opponent could have played ${forkPart}.`,
          `${forkPart}. Your opponent missed this tactic.`
        ]);
  }
  if (motif.pin) {
    return isUser
      ? pick(ply, [
          `${motif.san} would have created a pin: ${motif.pin.toLowerCase()}.`,
          `A pin was available with ${motif.san}: ${motif.pin.toLowerCase()}.`
        ])
      : pick(ply, [
          `Your opponent could have pinned with ${motif.san}: ${motif.pin.toLowerCase()}.`
        ]);
  }
  if (motif.skewer) {
    return isUser
      ? pick(ply, [
          `${motif.san} would have set up a skewer: ${motif.skewer.toLowerCase()}.`,
          `A skewer was available with ${motif.san}: ${motif.skewer.toLowerCase()}.`
        ])
      : pick(ply, [
          `Your opponent could have skewered with ${motif.san}: ${motif.skewer.toLowerCase()}.`
        ]);
  }
  if (motif.captureGain && motif.captureGain.value >= 3) {
    return isUser
      ? pick(ply, [
          `${motif.san} was available, winning the ${motif.captureGain.capturedName}.`,
          `You could have won the ${motif.captureGain.capturedName} with ${motif.san}.`
        ])
      : pick(ply, [
          `Your opponent could have won the ${motif.captureGain.capturedName} with ${motif.san}.`
        ]);
  }
  return null;
}

// -- Main explanation generator --

function isBadClassification(c: string): boolean {
  return c === 'Inaccuracy' || c === 'Mistake' || c === 'Miss' || c === 'Blunder';
}

// ── Contextual habit principles ──────────────────────────────────────────────

function detectContextualPrinciple(
  boardAfter: Chess,
  move: ClassifiedMove,
  movingColor: 'w' | 'b',
  ply: number,
  isCapture: boolean,
  _classification: string
): string | null {
  const opponentColor: 'w' | 'b' = movingColor === 'w' ? 'b' : 'w';
  const toSq = move.to as Square;
  const fromSq = move.from as Square;

  // A. Moved piece itself is now hanging on its new square
  if (!isCapture
    && boardAfter.isAttacked(toSq, opponentColor)
    && !boardAfter.isAttacked(toSq, movingColor)) {
    return pick(ply, [
      'Always verify your destination square is safe before moving — a piece that lands in danger can be taken immediately.',
      'Check that your new square is defended or hard to attack. Hanging pieces hand your opponent free material.',
      'Before placing a piece, ask: can my opponent take it for free on the next move?',
      'Every move should answer: is my piece safe here? This one lands on a square your opponent can exploit.',
    ]);
  }

  // B. Queen deployed early
  if (move.piece === 'q' && ply < 14) {
    return pick(ply, [
      'Moving the queen early risks losing tempos when it gets chased. Develop your knights and bishops first, then bring the queen to an active role.',
      'The queen is powerful but vulnerable to tempo attacks. Develop minor pieces first — the queen will find the right square once the foundation is laid.',
      'Early queen moves invite your opponent to gain time by chasing it. Minor piece development first is a more durable approach.',
    ]);
  }

  // C. Flank pawn push in the opening
  if (move.piece === 'p' && ply < 16) {
    const file = move.to[0];
    if (file === 'a' || file === 'b' || file === 'g' || file === 'h') {
      return pick(ply, [
        'Wing pawn moves in the opening delay development and can weaken your position. Focus on central control and getting your pieces into play first.',
        "In the opening, every tempo counts. Flank pawn moves that don't control the center are often too slow.",
        'Flank pawn advances are risky before the center is secured. Your opponent may exploit the delay in development.',
      ]);
    }
  }

  // D. King still uncastled in the middlegame
  if (ply >= 20) {
    const kingStartSq = (movingColor === 'w' ? 'e1' : 'e8') as Square;
    const king = boardAfter.get(kingStartSq);
    if (king && king.type === 'k' && king.color === movingColor) {
      const castlingFen = boardAfter.fen().split(' ')[2] ?? '-';
      const hasRights = movingColor === 'w'
        ? castlingFen.includes('K') || castlingFen.includes('Q')
        : castlingFen.includes('k') || castlingFen.includes('q');
      if (hasRights) {
        return pick(ply, [
          'Your king is still uncastled in the middlegame. Prioritize castling — an exposed king in the center is a constant liability.',
          'With your king still in the center, every inaccuracy costs more. Complete your development and castle as soon as possible.',
          'An uncastled king in the middlegame is a target. Getting it to safety should take priority over other plans.',
          'The king needs to castle. Leaving it in the center gives your opponent attacking possibilities on every open file.',
        ]);
      }
    }
  }

  // E. Moving the same piece twice in the opening (wasting tempo)
  if (ply < 20 && move.piece !== 'p' && move.piece !== 'k') {
    const color = ply % 2 === 1 ? 'w' : 'b';
    const startRankW = move.piece === 'n' ? '1' : '1';
    const startRankB = '8';
    const isStartRank = (color === 'w' && fromSq[1] === startRankW) || (color === 'b' && fromSq[1] === startRankB);
    // Only flag if the piece is NOT on its start rank (i.e. it already moved once)
    if (!isStartRank) {
      return pick(ply, [
        'Moving the same piece twice in the opening costs you a development tempo. Each move should bring a new piece into play.',
        "Retreating or repositioning an already-moved piece in the opening can fall behind on development. Try to develop a new piece instead.",
      ]);
    }
  }

  // F. Piece trade that leaves doubled pawns (captures handled upstream; target isolated/doubled pawn structures)
  if (isCapture && move.piece === 'p') {
    const file = toSq[0];
    let count = 0;
    for (let r = 1; r <= 8; r++) {
      const p = boardAfter.get(`${file}${r}` as Square);
      if (p && p.type === 'p' && p.color === movingColor) count++;
    }
    if (count >= 2) {
      return pick(ply, [
        `This capture creates doubled pawns on the ${file}-file. Doubled pawns are harder to defend and limit pawn mobility.`,
        `You now have doubled pawns on the ${file}-file — a long-term structural weakness worth keeping in mind.`,
      ]);
    }
  }

  return null;
}

/**
 * Generate a human-readable coaching explanation for a classified move.
 * Pure function -- no service dependencies.
 */
export function generateMoveExplanation(
  move: ClassifiedMove,
  fenBefore: string,
  fenAfter: string
): string {
  const boardBefore = new Chess(fenBefore);
  const boardAfter = new Chess(fenAfter);

  const isCheck = move.san.includes('+');
  const isCheckmate = move.san.includes('#');
  const isCastling = move.san === 'O-O' || move.san === 'O-O-O';
  const isCapture = move.san.includes('x');
  const isPromotion = move.san.includes('=');
  const isEnPassant = (() => {
    try {
      const legalMoves = boardBefore.moves({ verbose: true });
      return legalMoves.some(m => m.from === move.from && m.to === move.to && m.flags?.includes('e'));
    } catch { return false; }
  })();

  const ply = move.ply;
  const isUser = move.isUserMove;
  const classification = move.classification;
  const name = pieceName(move.piece);
  const movingColor: 'w' | 'b' = ply % 2 === 1 ? 'w' : 'b';

  // -- Hoist capture info (needed for hangExcludeSquare) --
  let capturedPiece: string | null = null;
  let capturedName = 'piece';
  let movedValue = PIECE_VALUES[move.piece] ?? 0;
  let capturedValue = 0;
  if (isCapture) {
    try {
      const legalMoves = boardBefore.moves({ verbose: true });
      capturedPiece = legalMoves.find(m => m.from === move.from && m.to === move.to)?.captured ?? null;
    } catch { /* ignore */ }
    capturedName = capturedPiece ? pieceName(capturedPiece) : 'piece';
    capturedValue = capturedPiece ? (PIECE_VALUES[capturedPiece] ?? 0) : 0;
  }

  // -- Special classifications --
  if (classification === 'Book') {
    return isUser
      ? pick(ply, [
          'You play a book move. Solid and well-tested.',
          'Following known theory here. Nothing fancy, just sound play.',
          'A standard line. This has been tested in many games before.',
          'Theory. A reliable choice backed by years of top-level practice.',
          'A book move — well-charted territory. Solid foundation for what comes next.'
        ])
      : pick(ply, [
          'Your opponent plays a book move. A known continuation.',
          'Theory from your opponent. Following established lines.',
          'A standard response. Well-known and reliable.',
          'Your opponent stays in theory. A solid, tested reply.'
        ]);
  }

  if (classification === 'Forced') {
    if (isCheckmate) {
      return isUser
        ? 'Checkmate! The only move, and it finishes the game.'
        : 'Checkmate. Your opponent had no other option, and the game is over.';
    }
    if (isCheck) {
      return isUser
        ? 'The only legal move, and it delivers check.'
        : 'Your opponent has only one legal move, and it comes with check.';
    }
    return isUser
      ? pick(ply, [
          'The only legal move. The position leaves you no choice.',
          'Forced. There was nothing else available.',
          'No alternatives here. This is the only legal option.',
          'Only one legal move — the position dictates it.'
        ])
      : pick(ply, [
          'The only legal move for your opponent.',
          'Forced. Your opponent had no other option.',
          'No choice for your opponent. Only one legal move.',
          'Your opponent had to play this — forced by the position.'
        ]);
  }

  if (isCheckmate) {
    return isUser
      ? pick(ply, [
          'Checkmate! Well played.',
          'Checkmate! Clean and decisive.',
          'Checkmate! That closes it out.',
          'Checkmate! The position is won and the game is over.',
          'Checkmate. A fitting end to the game.'
        ])
      : pick(ply, [
          'Checkmate. The game is over.',
          'Your opponent delivers checkmate.',
          'Checkmate. Nothing could be done to prevent it.',
          'Checkmate. A decisive finish from your opponent.'
        ]);
  }

  // -- Gather motifs --
  // Tactical motif labels (fork, pin, skewer) are only surfaced for strong moves
  // to avoid every move being described purely in tactical terms.
  const isHighQuality = classification === 'Brilliant' || classification === 'Great' || classification === 'Best';
  const fork = isHighQuality ? detectFork(boardAfter, move) : null;
  const pin = isHighQuality ? detectPin(boardAfter, move) : null;
  const skewer = isHighQuality ? detectSkewer(boardAfter, move) : null;
  const discovered = detectDiscoveredAttack(boardBefore, boardAfter, move);
  const development = detectDevelopment(move, ply, isUser);
  const isBad = isBadClassification(classification);
  const positionalPurpose = !isCapture ? detectPositionalPurpose(boardBefore, boardAfter, move, movingColor, ply, isUser) : null;
  const badMoveProblem = (isBad && isUser) ? detectBadMoveProblem(boardBefore, boardAfter, move, movingColor, ply) : null;

  // Exclude destination from hanging check when capture is equal or advantageous
  const hangExcludeSquare: Square | undefined =
    (isCapture && capturedValue >= movedValue) ? move.to as Square : undefined;

  const hangingPieces = isBad ? detectHangingPieces(boardAfter, movingColor, hangExcludeSquare) : [];
  const hangingText = hangingPieces.length > 0
    ? (isUser
        ? pick(ply, [
            `Be careful: your ${hangingPieces[0].name} on ${hangingPieces[0].square} is undefended. Always check piece safety before committing.`,
            `Your ${hangingPieces[0].name} on ${hangingPieces[0].square} has no protection now. Scan for hanging pieces before every move.`,
            `This leaves your ${hangingPieces[0].name} on ${hangingPieces[0].square} without a defender.`
          ])
        : `Your opponent's ${hangingPieces[0].name} on ${hangingPieces[0].square} is undefended. An opportunity in the position.`)
    : null;

  const parts: string[] = [];

  // -- Castling --
  if (isCastling) {
    const side = move.san === 'O-O' ? 'kingside' : 'queenside';
    return isUser
      ? pick(ply, [
          `You castle ${side}. King is safe and the rooks connect.`,
          `${capitalize(side)} castling. Good: king safety secured.`,
          `Castling ${side}. The king is tucked away and the rook enters play.`
        ])
      : pick(ply, [
          `Your opponent castles ${side}. King is now safer.`,
          `${capitalize(side)} castling by your opponent. Rooks now connected.`,
          `Your opponent tucks the king away with ${side} castling.`
        ]);
  }

  // -- Promotion --
  if (isPromotion) {
    const promotedTo = move.san.match(/=([QRBN])/)?.[1] ?? 'Q';
    const promotedName = pieceName(promotedTo.toLowerCase());
    return isUser
      ? pick(ply, [
          `You promote to ${promotedName}. A decisive advantage.`,
          `Promotion to ${promotedName}! The pawn reaches the back rank.`,
          `Your pawn becomes a ${promotedName}. Well earned.`
        ])
      : pick(ply, [
          `Your opponent promotes to ${promotedName}. A new piece enters the board.`,
          `Promotion to ${promotedName} for your opponent.`,
          `Your opponent's pawn becomes a ${promotedName}.`
        ]);
  }

  // -- En passant --
  if (isEnPassant) {
    return isUser
      ? pick(ply, [
          'You take en passant. Good eye.',
          'En passant capture. Alert play.',
          'En passant! The passing pawn is captured.'
        ])
      : pick(ply, [
          'Your opponent takes en passant.',
          'En passant capture by your opponent.',
          'Your opponent catches the passing pawn en passant.'
        ]);
  }

  // -- Check prefix (always first when the move gives check) --
  if (isCheck) {
    parts.push(isUser
      ? pick(ply, [
          `Check! Your ${name} attacks the king from ${move.to}.`,
          `Check — your ${name} reaches the king on ${move.to}.`,
          `Your ${name} gives check from ${move.to}. The king must respond.`,
        ])
      : pick(ply, [
          `Check! Your opponent's ${name} attacks your king from ${move.to}.`,
          `Check — your opponent's ${name} reaches your king on ${move.to}.`,
          `Your opponent's ${name} delivers check from ${move.to}.`,
        ]));
  }

  // -- Captures --
  if (isCapture) {
    // Motif-first capture descriptions
    if (fork) {
      parts.push(isUser
        ? pick(ply, [
            `You capture the ${capturedName} and ${fork.text.toLowerCase()}. A strong combination.`,
            `${fork.text}! You win material with a double attack.`,
            `You take the ${capturedName} with a fork: ${fork.targets.join(' and ')} are both threatened.`
          ])
        : pick(ply, [
            `Your opponent captures the ${capturedName} and ${fork.text.toLowerCase()}.`,
            `${fork.text}. Your opponent wins material with a double attack.`
          ]));
    } else if (pin) {
      parts.push(isUser
        ? `You take the ${capturedName}. ${pin}.`
        : `Your opponent takes the ${capturedName}. ${pin}.`);
    } else if (skewer) {
      parts.push(isUser
        ? `You take the ${capturedName}. ${skewer}.`
        : `Your opponent takes the ${capturedName}. ${skewer}.`);
    } else if (movedValue === capturedValue) {
      // True exchange: equal value AND the capturing piece can itself be recaptured
      const toSq = move.to as Square;
      const opponentCanRecapture = boardAfter.isAttacked(toSq, movingColor === 'w' ? 'b' : 'w');
      if (opponentCanRecapture) {
        parts.push(isUser
          ? pick(ply, [
              `You exchange ${name}s. Neither side gains material.`,
              `${capitalize(name)} for ${capturedName}. An even exchange.`,
              `You trade the ${name} for the ${capturedName}. The material balance stays equal.`
            ])
          : pick(ply, [
              `Your opponent exchanges ${name}s. An even trade.`,
              `${capitalize(name)} for ${capturedName}. Material stays balanced.`,
              `Your opponent trades the ${name} for the ${capturedName}. Nothing changes on the material ledger.`
            ]));
      } else {
        // Capturing piece cannot be recaptured — straightforward capture, not an exchange
        parts.push(isUser
          ? pick(ply, [
              `You capture the ${capturedName} with the ${name}.`,
              `${capitalize(name)} takes the ${capturedName}. A clean pick-up.`,
              `You win the ${capturedName} — the ${name} lands safely.`
            ])
          : pick(ply, [
              `Your opponent captures the ${capturedName} with the ${name}.`,
              `The ${capturedName} falls to your opponent's ${name}.`,
              `Your opponent takes the ${capturedName} and the ${name} cannot be challenged.`
            ]));
      }
    } else if (capturedValue > movedValue) {
      // Capture: winning material
      parts.push(isUser
        ? pick(ply, [
            `You win the ${capturedName} with your ${name}. Good capture.`,
            `You take the ${capturedName}. Material advantage gained.`,
            `${capitalize(name)} captures the ${capturedName}. A concrete advantage.`,
            `The ${capturedName} is yours — a clean pick-up that tips the balance.`,
            `Nice. The ${capturedName} falls to your ${name}, shifting the material count in your favour.`
          ])
        : pick(ply, [
            `Your opponent wins the ${capturedName}. A material setback for you.`,
            `The ${capturedName} falls. A costly loss.`,
            `Your opponent picks up the ${capturedName} — you're down material now.`,
            `The ${capturedName} is taken. A setback that demands a concrete plan to compensate.`
          ]));
    } else {
      // Capturing piece is MORE valuable -- check if actually a sacrifice
      const toSq = move.to as Square;
      if (isTrueSacrificeCapture(boardAfter, toSq, movingColor, movedValue, capturedValue)) {
        parts.push(isUser
          ? pick(ply, [
              `You give the ${name} for a ${capturedName}. A sacrifice: the position must justify it.`,
              `${capitalize(name)} for a ${capturedName}. You invest material for positional or tactical compensation.`,
              `You sacrifice the ${name} for the ${capturedName}. Bold, but it needs to be backed by calculation.`,
              `Deliberately trading the ${name} for a ${capturedName}. The value is in what comes next, not the material count.`
            ])
          : pick(ply, [
              `Your opponent sacrifices the ${name} for a ${capturedName}. A calculated risk.`,
              `Your opponent gives the ${name} for the ${capturedName}. A sacrifice looking for compensation.`,
              `The ${name} is offered — your opponent judges the resulting position to be worth it.`
            ]));
      } else {
        // Capturing a less-valuable piece with a more-valuable one, not truly given up
        parts.push(isUser
          ? pick(ply, [
              `You take the ${capturedName} with the ${name}.`,
              `You capture the ${capturedName}.`,
              `${capitalize(name)} captures the ${capturedName}.`,
              `The ${capturedName} is removed — a straightforward capture.`
            ])
          : pick(ply, [
              `Your opponent takes the ${capturedName} with the ${name}.`,
              `Your opponent captures the ${capturedName}.`,
              `The ${capturedName} is cleared by your opponent's ${name}.`
            ]));
      }
    }
  } else {
    // -- Non-capture moves --
    if (fork) {
      parts.push(isUser
        ? pick(ply, [
            `${fork.text}! A double attack.`,
            `You set up a fork: ${fork.targets.join(' and ')} are both under threat.`,
            `${capitalize(name)} creates a fork on the ${fork.targets.join(' and ')}.`
          ])
        : pick(ply, [
            `${fork.text}. Your opponent creates a double attack.`,
            `Your opponent forks the ${fork.targets.join(' and ')}.`
          ]));
    } else if (pin) {
      parts.push(isUser
        ? `${pin}. The pinned piece is restricted.`
        : `Your opponent is ${pin.toLowerCase()}.`);
    } else if (skewer) {
      parts.push(isUser
        ? `${skewer}.`
        : `Your opponent is ${skewer.toLowerCase()}.`);
    } else if (discovered) {
      parts.push(isUser
        ? `${discovered}.`
        : `Your opponent: ${discovered.replace('your', "their")}.`);
    } else if (!isCheck) {
      // Only add a default description when there's no check already in parts
      if (development) {
        parts.push(`${development}.`);
      } else if (positionalPurpose) {
        parts.push(`${positionalPurpose}.`);
      } else if (move.piece === 'p') {
        const pawnColor = movingColor;
        if (detectPassedPawn(boardAfter, move.to as Square, pawnColor)) {
          parts.push(isUser
            ? pick(ply, [
                'You advance the passed pawn. No enemy pawns can stop it.',
                'Pushing the passed pawn forward. Each step closer to promotion counts.',
                'Your passed pawn moves ahead — with the road clear, every push counts.',
                'The passed pawn rolls forward. The opponent must scramble to contain it.'
              ])
            : pick(ply, [
                'Your opponent advances a passed pawn. Watch it carefully.',
                'The passed pawn pushes forward. No pawns blocking its path.',
                'Your opponent pushes the passed pawn — an urgent long-term threat.',
                'The passed pawn advances. Creating a blocker should be a priority.'
              ]));
        } else {
          parts.push(isUser
            ? pick(ply, [
                `You push the pawn to ${move.to}.`,
                `Pawn to ${move.to}. Steady progress.`,
                `You advance to ${move.to}.`,
                `The pawn steps to ${move.to}, contesting space.`
              ])
            : pick(ply, [
                `Your opponent pushes the pawn to ${move.to}.`,
                `Pawn to ${move.to} by your opponent.`,
                `Your opponent advances to ${move.to}, claiming ground.`
              ]));
        }
      } else {
        parts.push(isUser
          ? pick(ply, [
              `You move the ${name} to ${move.to}.`,
              `${capitalize(name)} to ${move.to}. The piece finds a new square.`,
              `You place the ${name} on ${move.to}.`,
              `${capitalize(name)} relocates to ${move.to}, looking for a more active role.`
            ])
          : pick(ply, [
              `Your opponent moves the ${name} to ${move.to}.`,
              `${capitalize(name)} to ${move.to} for your opponent.`,
              `Your opponent repositions the ${name} to ${move.to}.`,
              `The ${name} shifts to ${move.to} — worth tracking its new targets.`
            ]));
      }
    }
  }

  // -- Hanging-piece warnings (bad moves only) --
  if (hangingText && !fork) {
    parts.push(hangingText);
  }

  // -- Why the move is bad (bad user moves only) --
  if (badMoveProblem) {
    parts.push(badMoveProblem);
  }

  // -- Best-move suggestion with missed-motif analysis (bad moves only) --
  if (isBad && move.bestMove) {
    const bestMotif = analyzeBestMove(fenBefore, move.bestMove);
    if (bestMotif) {
      const missedText = buildMissedMotifText(bestMotif, ply, isUser);
      if (missedText) {
        parts.push(missedText);
      } else {
        parts.push(isUser
          ? pick(ply, [
              `${bestMotif.san} was the stronger choice here.`,
              `${bestMotif.san} kept the position under control.`,
              `You had ${bestMotif.san}, which was more solid.`,
              `${bestMotif.san} was the move — sharper and more precise.`,
              `Worth noting: ${bestMotif.san} would have kept the tension and stayed ahead.`
            ])
          : pick(ply, [
              `Your opponent could have played ${bestMotif.san} instead.`,
              `${bestMotif.san} was available and stronger.`,
              `${bestMotif.san} was the better option — a missed opportunity.`
            ]));
      }
    }
  }

  // -- Opponent follow-up (bad moves only) --
  if (isBad && move.opponentBestResponse) {
    const opponentSan = uciToSan(fenAfter, move.opponentBestResponse);
    if (opponentSan) {
      parts.push(isUser
        ? pick(ply, [
            `After this, your opponent can play ${opponentSan}, taking advantage of the position.`,
            `This allows ${opponentSan} in response, which puts you in difficulty.`,
            `Your opponent now has ${opponentSan}, exploiting the weakness.`,
            `${opponentSan} is now available — and it hurts.`,
            `Watch out for ${opponentSan}. This move hands your opponent a strong reply.`
          ])
        : pick(ply, [
            `You can now respond with ${opponentSan}, taking advantage of the position.`,
            `This gives you ${opponentSan}, improving your situation.`,
            `You have ${opponentSan} available, pressing the advantage.`,
            `${opponentSan} is on the board for you — a direct improvement.`
          ]));
    }
  }

  // -- Contextual principles (bad/inaccurate user moves only) --
  if (isBad && isUser) {
    const principle = detectContextualPrinciple(boardAfter, move, movingColor, ply, isCapture, classification);
    if (principle) {
      parts.push(principle);
    }
  }

  // -- Classification framing --
  if (parts.length > 0) {
    if (classification === 'Brilliant') {
      parts[0] = `Brilliant! ${parts[0]}`;
    } else if (classification === 'Great' && !parts[0].startsWith('Brilliant')) {
      parts[0] = pick(ply, ['Excellent! ', 'A strong move! ', 'Well played! ']) + parts[0];
    }
  }

  if (parts.length === 0) {
    return isUser
      ? `You play ${move.san}. The position called for something stronger.`
      : `Your opponent plays ${move.san}. A ${classification.toLowerCase()} move.`;
  }

  return parts.join(' ');
}
