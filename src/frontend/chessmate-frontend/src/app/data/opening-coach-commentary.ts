/**
 * Static coaching commentary for opening moves.
 * Maps common opening move SANs (in context of move number + position) to human-readable explanations.
 * Used by the coach panel on the Opening Explorer page.
 */

const MOVE_COACHING: Record<string, string[]> = {
  // ── White first moves ──
  'e4': [
    'The King\'s Pawn opening — controls d5 and f5, opens lines for the bishop and queen. The most popular first move in chess history.',
  ],
  'd4': [
    'The Queen\'s Pawn opening — controls e5 and c5. Unlike 1. e4, the d4 pawn is already protected by the queen, making it harder to challenge immediately.',
  ],
  'c4': [
    'The English Opening — controls d5 from the flank. A flexible choice that can transpose into many different structures.',
  ],
  'Nf3': [
    'A flexible first move developing a piece toward the center. It controls d4 and e5 while keeping all pawn structure options open.',
  ],
  'f4': [
    'Bird\'s Opening — immediately grabs control of the e5 square. An ambitious choice that declares kingside intentions from move one.',
  ],

  // ── Black responses to 1. e4 ──
  'e5': [
    'The symmetrical response — mirrors White\'s central control. Leads to classical open games with piece play.',
  ],
  'c5': [
    'The Sicilian Defense — fighting for center control asymmetrically. Black trades a flank pawn for White\'s central d-pawn.',
  ],
  'e6': [
    'The French Defense — a solid move preparing ...d5 to challenge the center immediately. The trade-off is the light-squared bishop gets blocked.',
  ],
  'c6': [
    'The Caro-Kann — preparing ...d5 while keeping the diagonal open for the light-squared bishop. Solid and reliable.',
  ],
  'd5': [
    'An immediate challenge to White\'s center! In the Scandinavian, this directly attacks e4. Bold and committal.',
  ],
  'd6': [
    'A flexible move — can lead to the Pirc or Philidor Defense. Supports ...e5 while keeping many options open.',
  ],
  'Nf6': [
    'Attacking the e4 pawn immediately! This can lead to Alekhine\'s Defense (vs 1. e4) or Indian systems (vs 1. d4) — both very dynamic.',
  ],
  'f5': [
    'The Dutch Defense — seizing control of e4 from the very first move. Ambitious but slightly weakens the kingside.',
  ],
  'g6': [
    'Preparing to fianchetto the bishop to g7 — the hypermodern approach. The bishop will exert long-range pressure on the center.',
  ],

  // ── Common development moves ──
  'Nc3': [
    'Developing the knight to its most natural square, defending e4 and preparing to fight for d5.',
  ],
  'Nc6': [
    'The most natural development — defending the e5 pawn while developing toward the center.',
  ],
  'Bc4': [
    'The Italian bishop! Targeting f7 — the weakest point in Black\'s position, only defended by the king.',
  ],
  'Bb5': [
    'The Ruy Lopez bishop — applying indirect pressure on e5 through the c6 knight. A cornerstone of classical chess.',
  ],
  'Bb4': [
    'Pinning the knight to the king! This is the key idea of the Nimzo-Indian — controlling e4 by immobilizing the c3 knight.',
  ],
  'Bg5': [
    'Pinning the knight on f6 to the queen. This creates immediate tension — should Black break the pin or tolerate it?',
  ],
  'Bf4': [
    'The London bishop — developing outside the pawn chain before playing e3. A systematic and solid approach.',
  ],
  'Bg7': [
    'The fianchettoed bishop — a powerhouse on the long diagonal. From g7, it controls the center and supports both attack and defense.',
  ],
  'Be7': [
    'A modest but solid development — the bishop supports kingside castling and maintains a flexible position.',
  ],
  'b6': [
    'Preparing to fianchetto the queen\'s bishop to b7, aiming at the long light-square diagonal toward the center.',
  ],
  'g3': [
    'Preparing to fianchetto — the bishop on g2 will control the long diagonal. A sophisticated positional approach.',
  ],
  'O-O': [
    'Castling! The king is safe, and the rook joins the fight. One of the most important moves in the opening.',
  ],
  'a6': [
    'A useful waiting move — prevents Bb5 and prepares ...b5 for queenside expansion. Small but significant.',
  ],
  'b5': [
    'Expanding on the queenside! This can gain space, attack the c4 pawn, or support a queenside pawn majority.',
  ],
  'exd5': [
    'Capturing toward the center — opening lines and creating a new pawn structure to navigate.',
  ],
  'cxd4': [
    'Trading a flank pawn for a center pawn — the fundamental idea behind the Sicilian and many Queen\'s Pawn defenses.',
  ],
  'dxc4': [
    'Accepting the gambit! Taking the c4 pawn. White will typically recover it, but Black gets temporary material and disrupts White\'s center.',
  ],
  'Nbd7': [
    'A flexible knight development — supports the center from behind and keeps options open for ...c5 or ...e5 breaks.',
  ],
  'Re1': [
    'Placing the rook on the open or semi-open e-file — increasing pressure on the center and supporting the e-pawn.',
  ],
  'Qe2': [
    'Connecting the rooks and supporting e4. The queen on e2 also prepares potential central or kingside expansion.',
  ],
  'h3': [
    'A prophylactic move — preventing ...Bg4, which would pin the knight on f3 to the queen.',
  ],
  'a3': [
    'A prophylactic move — preventing ...Bb4 pin and preparing possible b4 expansion on the queenside.',
  ],
};

/**
 * Returns a coaching explanation for the given SAN move.
 * Falls back to a generic positional comment if the move isn't in the curated database.
 */
export function getOpeningMoveCoaching(san: string, moveNumber: number, sideToMove: 'white' | 'black'): string {
  const cleanSan = san.replace(/[+#!?]/g, '');

  const explanations = MOVE_COACHING[cleanSan];
  if (explanations) {
    return explanations[0];
  }

  return buildGenericExplanation(cleanSan, moveNumber, sideToMove);
}

function buildGenericExplanation(san: string, _moveNumber: number, sideToMove: 'white' | 'black'): string {
  const side = sideToMove === 'white' ? 'White' : 'Black';

  if (san.startsWith('N')) {
    return `${side} develops a knight — improving piece activity and fighting for central control.`;
  }

  if (san.startsWith('B')) {
    return `${side} develops a bishop — opening a diagonal and increasing piece coordination.`;
  }

  if (san.startsWith('R')) {
    return `${side} activates a rook — placing it on an open or semi-open file for central influence.`;
  }

  if (san.startsWith('Q')) {
    return `${side} moves the queen — a powerful piece that can influence the game from any square, but early queen moves can lose tempo.`;
  }

  if (san.startsWith('K') || san === 'O-O' || san === 'O-O-O') {
    return `${side} prioritizes king safety — an essential part of the opening phase.`;
  }

  if (san.includes('x')) {
    return `${side} makes a capture — changing the pawn structure and creating new tactical patterns.`;
  }

  return `${side} continues development — building toward a strong middlegame position.`;
}
