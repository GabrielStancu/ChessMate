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
  // When the piece moves away from its square, it might uncover an attack by a
  // friendly sliding piece on a valuable enemy piece.
  const fromSq = move.from as Square;
  const sqs = allSquares();
  for (const sq of sqs) {
    const target = boardAfter.get(sq);
    if (!target || target.color !== opponentColor || target.type === 'p') continue;
    const wasAttacked = boardBefore.isAttacked(sq, movingColor);
    const nowAttacked = boardAfter.isAttacked(sq, movingColor);
    if (!wasAttacked && nowAttacked) {
      // Verify it's actually discovered — check that the newly attacking piece
      // is NOT the moved piece itself
      const fen = boardAfter.fen();
      const movedPieceSq = move.to as Square;
      // Quick heuristic: if the target is on the same ray as the fromSquare
      if (areOnSameRay(fromSq, sq)) {
        return `Discovered attack on the ${pieceName(target.type)}`;
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
          'A standard line. This has been tested in many games before.'
        ])
      : pick(ply, [
          'Your opponent plays a book move. A known continuation.',
          'Theory from your opponent. Following established lines.',
          'A standard response. Well-known and reliable.'
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
          'No alternatives here. This is the only legal option.'
        ])
      : pick(ply, [
          'The only legal move for your opponent.',
          'Forced. Your opponent had no other option.',
          'No choice for your opponent. Only one legal move.'
        ]);
  }

  if (isCheckmate) {
    return isUser
      ? pick(ply, [
          'Checkmate! Well played.',
          'Checkmate! Clean and decisive.',
          'Checkmate! That closes it out.'
        ])
      : pick(ply, [
          'Checkmate. The game is over.',
          'Your opponent delivers checkmate.',
          'Checkmate. Nothing could be done to prevent it.'
        ]);
  }

  // -- Gather motifs --
  const fork = detectFork(boardAfter, move);
  const pin = detectPin(boardAfter, move);
  const skewer = detectSkewer(boardAfter, move);
  const discovered = detectDiscoveredAttack(boardBefore, boardAfter, move);
  const development = detectDevelopment(move, ply, isUser);
  const isBad = isBadClassification(classification);

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
      // Exchange: equal value trade
      parts.push(isUser
        ? pick(ply, [
            `You exchange ${name}s. Neither side gains material.`,
            `${capitalize(name)} for ${capturedName}. An even exchange.`,
            `You trade ${name}s. The material balance stays equal.`
          ])
        : pick(ply, [
            `Your opponent exchanges ${name}s. An even trade.`,
            `${capitalize(name)} for ${capturedName}. Your opponent keeps the balance.`,
            `Your opponent trades ${name}s. Material stays equal.`
          ]));
    } else if (capturedValue > movedValue) {
      // Capture: winning material
      parts.push(isUser
        ? pick(ply, [
            `You win the ${capturedName} with your ${name}. Good capture.`,
            `You take the ${capturedName}. Material advantage gained.`,
            `${capitalize(name)} captures the ${capturedName}. A concrete advantage.`
          ])
        : pick(ply, [
            `Your opponent wins the ${capturedName}. A material setback for you.`,
            `The ${capturedName} falls. A costly loss.`
          ]));
    } else {
      // Capturing piece is MORE valuable -- check if actually a sacrifice
      const toSq = move.to as Square;
      if (isTrueSacrificeCapture(boardAfter, toSq, movingColor, movedValue, capturedValue)) {
        parts.push(isUser
          ? pick(ply, [
              `You give the ${name} for a ${capturedName}. A sacrifice: the position must justify it.`,
              `${capitalize(name)} for a ${capturedName}. You invest material for positional or tactical compensation.`,
              `You sacrifice the ${name} for the ${capturedName}. Bold, but it needs to be backed by calculation.`
            ])
          : pick(ply, [
              `Your opponent sacrifices the ${name} for a ${capturedName}. A calculated risk.`,
              `Your opponent gives the ${name} for the ${capturedName}. A sacrifice looking for compensation.`
            ]));
      } else {
        // Capturing a less-valuable piece with a more-valuable one, not truly given up
        parts.push(isUser
          ? pick(ply, [
              `You take the ${capturedName} with the ${name}.`,
              `You capture the ${capturedName}.`,
              `${capitalize(name)} captures the ${capturedName}.`
            ])
          : pick(ply, [
              `Your opponent takes the ${capturedName} with the ${name}.`,
              `Your opponent captures the ${capturedName}.`
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
        : `Your opponent pins: ${pin.toLowerCase()}.`);
    } else if (skewer) {
      parts.push(isUser
        ? `${skewer}.`
        : `Your opponent skewers: ${skewer.toLowerCase()}.`);
    } else if (discovered) {
      parts.push(isUser
        ? `${discovered}! A hidden threat revealed.`
        : `Your opponent uncovers a ${discovered.toLowerCase()}.`);
    } else if (isCheck) {
      parts.push(isUser
        ? pick(ply, [
            `You check from ${move.to}. The king must respond.`,
            `${capitalize(name)} delivers check on ${move.to}. Keeping the pressure.`,
            `Check! Your ${name} attacks the king from ${move.to}.`
          ])
        : pick(ply, [
            `Your opponent checks from ${move.to}. You must respond.`,
            `${capitalize(name)} delivers check on ${move.to}.`,
            `Check from your opponent's ${name} on ${move.to}.`
          ]));
    } else if (development) {
      parts.push(`${development}.`);
    } else if (move.piece === 'p') {
      const pawnColor = movingColor;
      if (detectPassedPawn(boardAfter, move.to as Square, pawnColor)) {
        parts.push(isUser
          ? pick(ply, [
              'You advance the passed pawn. No enemy pawns can stop it.',
              'Pushing the passed pawn forward. Each step closer to promotion counts.',
              'Your passed pawn moves ahead. Keep it going.'
            ])
          : pick(ply, [
              'Your opponent advances a passed pawn. Watch it carefully.',
              'The passed pawn pushes forward. No pawns blocking its path.',
              'Your opponent pushes the passed pawn. This could become dangerous.'
            ]));
      } else {
        parts.push(isUser
          ? pick(ply, [
              `You push the pawn to ${move.to}.`,
              `Pawn to ${move.to}. Steady progress.`,
              `You advance to ${move.to}.`
            ])
          : pick(ply, [
              `Your opponent pushes the pawn to ${move.to}.`,
              `Pawn to ${move.to} by your opponent.`,
              `Your opponent advances to ${move.to}.`
            ]));
      }
    } else {
      parts.push(isUser
        ? pick(ply, [
            `You move the ${name} to ${move.to}.`,
            `${capitalize(name)} to ${move.to}. Improving the piece's position.`,
            `You place the ${name} on ${move.to}.`
          ])
        : pick(ply, [
            `Your opponent moves the ${name} to ${move.to}.`,
            `${capitalize(name)} to ${move.to} for your opponent.`,
            `Your opponent repositions the ${name} to ${move.to}.`
          ]));
    }
  }

  // -- Hanging-piece warnings (bad moves only) --
  if (hangingText && !fork) {
    parts.push(hangingText);
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
              `You had ${bestMotif.san}, which was more solid.`
            ])
          : pick(ply, [
              `Your opponent could have played ${bestMotif.san} instead.`,
              `${bestMotif.san} was available and stronger.`
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
            `Your opponent now has ${opponentSan}, exploiting the weakness.`
          ])
        : pick(ply, [
            `You can now respond with ${opponentSan}, taking advantage of the position.`,
            `This gives you ${opponentSan}, improving your situation.`,
            `You have ${opponentSan} available, pressing the advantage.`
          ]));
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
