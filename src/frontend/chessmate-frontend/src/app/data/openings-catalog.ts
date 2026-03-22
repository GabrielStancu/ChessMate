import { OpeningDefinition } from '../models/openings.models';

export const OPENINGS_CATALOG: OpeningDefinition[] = [
  // ── King's Pawn (1. e4) ──────────────────────────────────────────
  {
    id: 'italian-game',
    name: 'Italian Game',
    eco: 'C50',
    forSide: 'white',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    description: 'One of the oldest openings, aiming to control the center and target f7.',
    advantages: [
      'Rapid development of bishop to an active square',
      'Pressure on the f7 pawn (weakest point in Black\'s position)',
      'Flexible pawn structure allows multiple plans'
    ],
    drawbacks: [
      'Bishop on c4 can be challenged by ...d5',
      'Less space advantage compared to the Ruy Lopez',
      'Black has several solid equalizing options'
    ],
    goals: [
      'Develop pieces quickly toward the kingside',
      'Castle early and connect rooks',
      'Prepare d4 push to open the center'
    ],
    keySquares: ['c4', 'f7', 'd4', 'e4'],
    pawnBreaks: ['d4', 'f4']
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    eco: 'C60',
    forSide: 'white',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    description: 'The "Spanish Game" — a cornerstone of classical chess, applying pressure on the e5 pawn through the c6 knight.',
    advantages: [
      'Long-term strategic pressure on e5',
      'Maintains central tension for many moves',
      'Rich middlegame with plans for both sides'
    ],
    drawbacks: [
      'Requires deep theoretical knowledge in many lines',
      'The bishop on b5 can be kicked by ...a6',
      'Slow to create concrete threats'
    ],
    goals: [
      'Maintain control of the center with pawns on e4 and d4',
      'Use the bishop pair in the middlegame',
      'Prepare a kingside or central attack'
    ],
    keySquares: ['b5', 'e5', 'd4', 'f5'],
    pawnBreaks: ['d4', 'f4']
  },
  {
    id: 'sicilian-defense',
    name: 'Sicilian Defense',
    eco: 'B20',
    forSide: 'black',
    moves: '1. e4 c5',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    description: 'The most popular and statistically successful response to 1. e4, creating an asymmetric game from move one.',
    advantages: [
      'Asymmetric pawn structure creates winning chances for Black',
      'Half-open c-file gives Black queenside counterplay',
      'Statistically the best-scoring defense against 1. e4'
    ],
    drawbacks: [
      'Enormous theory in Open Sicilian lines',
      'Black\'s king can be vulnerable in sharp lines',
      'White often gets a lead in development'
    ],
    goals: [
      'Fight for the d4 square',
      'Create queenside counterplay on the c-file',
      'Trade a flank pawn (c5) for a center pawn (d4)'
    ],
    keySquares: ['d4', 'c5', 'e5', 'd5'],
    pawnBreaks: ['d5', 'b5', 'f5']
  },
  {
    id: 'french-defense',
    name: 'French Defense',
    eco: 'C00',
    forSide: 'black',
    moves: '1. e4 e6',
    fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    description: 'A solid but active defense that immediately challenges e4 with ...d5, creating a strategic battle.',
    advantages: [
      'Solid pawn structure with a clear plan (...d5)',
      'Good counterplay against White\'s center',
      'Leads to positions where understanding trumps memorization'
    ],
    drawbacks: [
      'Light-squared bishop on c8 is often passive',
      'Can lead to cramped positions for Black',
      'The e6 pawn blocks the bishop\'s diagonal'
    ],
    goals: [
      'Challenge the center with ...d5',
      'Undermine White\'s pawn chain with ...c5',
      'Activate the "bad" light-squared bishop'
    ],
    keySquares: ['d5', 'e4', 'c5', 'f5'],
    pawnBreaks: ['c5', 'f6']
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defense',
    eco: 'B10',
    forSide: 'black',
    moves: '1. e4 c6',
    fen: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    description: 'A solid defense preparing ...d5 while keeping the light-squared bishop free, favored by positional players.',
    advantages: [
      'Very solid pawn structure',
      'Light-squared bishop stays active (not blocked by ...e6)',
      'Few forced sharp lines — easier to play'
    ],
    drawbacks: [
      'Slightly passive in some variations',
      'Less dynamic counterplay than the Sicilian',
      'The c6 pawn blocks the natural development of Nb8-c6'
    ],
    goals: [
      'Play ...d5 to challenge the center immediately',
      'Develop the light-squared bishop before playing ...e6',
      'Reach a solid, slightly cramped but resilient position'
    ],
    keySquares: ['d5', 'e4', 'c6', 'e6'],
    pawnBreaks: ['c5', 'b5', 'f5']
  },
  {
    id: 'scandinavian-defense',
    name: 'Scandinavian Defense',
    eco: 'B01',
    forSide: 'black',
    moves: '1. e4 d5',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    description: 'An immediate challenge to White\'s e4 pawn, leading to an open and slightly unbalanced game.',
    advantages: [
      'Simple and direct — challenges the center immediately',
      'Relatively little theory compared to other 1. e4 responses',
      'Black gets active piece play'
    ],
    drawbacks: [
      'Queen comes out early to d5 and must move again',
      'White gets a space advantage with d4',
      'Black can fall behind in development'
    ],
    goals: [
      'Eliminate White\'s central pawn immediately',
      'Develop quickly to compensate for the early queen move',
      'Aim for solid pawn structure and piece activity'
    ],
    keySquares: ['d5', 'e4', 'd4', 'c6'],
    pawnBreaks: ['c5', 'b5']
  },
  {
    id: 'pirc-defense',
    name: 'Pirc Defense',
    eco: 'B07',
    forSide: 'black',
    moves: '1. e4 d6 2. d4 Nf6 3. Nc3 g6',
    fen: 'rnbqkb1r/ppp1pp1p/3p1np1/8/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 4',
    description: 'A hypermodern defense allowing White to build a big center, then striking at it from the flanks.',
    advantages: [
      'Flexible — Black can choose from several plans',
      'Fianchettoed bishop on g7 is powerful on the long diagonal',
      'Less theory to learn than mainline defenses'
    ],
    drawbacks: [
      'Concedes a large center to White',
      'Can be crushed if Black doesn\'t counterattack in time',
      'Passive if played without energy'
    ],
    goals: [
      'Fianchetto the bishop to g7 to pressure the center',
      'Strike with ...e5 or ...c5 to undermine White\'s center',
      'Use the flexible pawn structure for counterplay'
    ],
    keySquares: ['g7', 'e5', 'c5', 'd4'],
    pawnBreaks: ['c5', 'e5', 'b5']
  },
  {
    id: 'kings-gambit',
    name: "King's Gambit",
    eco: 'C30',
    forSide: 'white',
    moves: '1. e4 e5 2. f4',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq - 0 2',
    description: 'A romantic opening sacrificing a pawn for rapid development and attack on the f-file.',
    advantages: [
      'Immediate initiative and attacking chances',
      'Opens the f-file for the rook',
      'Surprise value — many players are unfamiliar with it'
    ],
    drawbacks: [
      'Weakens the king position (f2 pawn gone)',
      'A true pawn sacrifice — Black can hold the pawn',
      'Requires aggressive follow-up or White falls behind'
    ],
    goals: [
      'Open lines for a kingside attack',
      'Develop rapidly and castle queenside',
      'Use the f-file and diagonals for attacking chances'
    ],
    keySquares: ['f4', 'f7', 'e5', 'd4'],
    pawnBreaks: ['d4', 'e5'],
    isGambit: true
  },
  {
    id: 'scotch-game',
    name: 'Scotch Game',
    eco: 'C45',
    forSide: 'white',
    moves: '1. e4 e5 2. Nf3 Nc6 3. d4',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
    description: 'A direct opening that immediately opens the center, leading to open and tactical play.',
    advantages: [
      'Open center leads to active piece play',
      'Avoids heavy theory of the Ruy Lopez',
      'White gets development lead after the exchange'
    ],
    drawbacks: [
      'White loses the d-pawn for Black\'s e-pawn early',
      'Black equalizes relatively easily with accurate play',
      'Less long-term pressure than the Ruy Lopez'
    ],
    goals: [
      'Open the center immediately for piece activity',
      'Develop quickly and fight for the initiative',
      'Use the half-open d-file and active bishops'
    ],
    keySquares: ['d4', 'e5', 'c3', 'f4'],
    pawnBreaks: ['f4', 'e5']
  },
  {
    id: 'vienna-game',
    name: 'Vienna Game',
    eco: 'C25',
    forSide: 'white',
    moves: '1. e4 e5 2. Nc3',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
    description: 'A flexible alternative to 2. Nf3, keeping options open for a later f4 push or quiet development.',
    advantages: [
      'Flexible — can transpose to King\'s Gambit Deferred or quiet lines',
      'Knight on c3 supports e4 and prepares f4',
      'Less well-known, leading to unfamiliar positions for opponents'
    ],
    drawbacks: [
      'Delays kingside development (Nf3 not yet played)',
      'Black can equalize with several responses',
      'Less directly aggressive than 2. Nf3 lines'
    ],
    goals: [
      'Maintain e4 support and prepare f4 push',
      'Keep the position flexible for multiple plans',
      'Develop pieces in harmony toward the kingside'
    ],
    keySquares: ['e4', 'f4', 'c3', 'd5'],
    pawnBreaks: ['f4', 'd4']
  },

  // ── Queen's Pawn (1. d4) ──────────────────────────────────────────
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    eco: 'D06',
    forSide: 'white',
    moves: '1. d4 d5 2. c4',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
    description: 'Not a true gambit — White offers a pawn to gain central control and rapid development.',
    advantages: [
      'Strong central control with c4 challenging d5',
      'Excellent piece development paths',
      'Leads to rich strategic middlegames'
    ],
    drawbacks: [
      'Positional nature requires patience',
      'The "gambit" pawn can usually be recovered',
      'Black has solid defensive setups available'
    ],
    goals: [
      'Control the center with d4 and c4 pawns',
      'Develop minor pieces quickly (Nc3, Nf3, Bg5/Bf4)',
      'Exploit any weakness in Black\'s pawn structure'
    ],
    keySquares: ['c4', 'd5', 'e4', 'd4'],
    pawnBreaks: ['e4', 'c5'],
    isGambit: true
  },
  {
    id: 'queens-gambit-declined',
    name: "Queen's Gambit Declined",
    eco: 'D30',
    forSide: 'black',
    moves: '1. d4 d5 2. c4 e6',
    fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
    description: 'A solid and classical defense where Black supports d5 with ...e6, maintaining a strong center.',
    advantages: [
      'Extremely solid pawn structure',
      'Proven at the highest levels of chess',
      'Black gets a reliable, safe position'
    ],
    drawbacks: [
      'Light-squared bishop is passive behind the e6 pawn',
      'Can lead to slightly cramped positions',
      'White often gets a small but stable advantage'
    ],
    goals: [
      'Maintain the pawn on d5 as an anchor',
      'Find an active role for the light-squared bishop',
      'Prepare ...c5 or ...e5 breaks to free the position'
    ],
    keySquares: ['d5', 'e6', 'c5', 'e5'],
    pawnBreaks: ['c5', 'e5']
  },
  {
    id: 'slav-defense',
    name: 'Slav Defense',
    eco: 'D10',
    forSide: 'black',
    moves: '1. d4 d5 2. c4 c6',
    fen: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
    description: 'A solid defense supporting d5 with ...c6 while keeping the light-squared bishop free.',
    advantages: [
      'Light-squared bishop stays active (not blocked by ...e6)',
      'Very solid pawn structure',
      'Rich strategic play with multiple plans'
    ],
    drawbacks: [
      'The c6 pawn blocks the knight\'s natural square (Nb8-c6)',
      'Some lines are very theoretical',
      'Black\'s queenside development can be slow'
    ],
    goals: [
      'Support d5 solidly while keeping the bishop diagonal open',
      'Develop the light-squared bishop to f5 or g4',
      'Prepare ...e6 and ...Nbd7 for a solid setup'
    ],
    keySquares: ['d5', 'c6', 'f5', 'e6'],
    pawnBreaks: ['c5', 'e5', 'b5']
  },
  {
    id: 'london-system',
    name: 'London System',
    eco: 'D02',
    forSide: 'white',
    moves: '1. d4 d5 2. Nf3 Nf6 3. Bf4',
    fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R b KQkq - 3 3',
    description: 'A systematic opening where White develops the dark-squared bishop early, creating a solid, repeatable setup.',
    advantages: [
      'Very easy to learn — same setup against most defenses',
      'Solid structure with the bishop outside the pawn chain',
      'Low risk of an early disaster'
    ],
    drawbacks: [
      'Less ambitious than mainline d4 openings',
      'Opponents can equalize comfortably if they know the theory',
      'Can lead to slower, more positional games'
    ],
    goals: [
      'Develop the bishop to f4 before playing e3',
      'Build a solid pyramid with pawns on d4, e3, c3',
      'Castle kingside and prepare a kingside or central break'
    ],
    keySquares: ['f4', 'd4', 'e3', 'c3'],
    pawnBreaks: ['e4', 'c4']
  },
  {
    id: 'catalan-opening',
    name: 'Catalan Opening',
    eco: 'E00',
    forSide: 'white',
    moves: '1. d4 Nf6 2. c4 e6 3. g3',
    fen: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR b KQkq - 0 3',
    description: 'A sophisticated system combining Queen\'s Gambit structure with a fianchettoed bishop, favored by positional players.',
    advantages: [
      'Fianchettoed bishop on g2 controls the long diagonal',
      'Long-lasting positional pressure',
      'Difficult for Black to equalize fully'
    ],
    drawbacks: [
      'White often sacrifices the c4 pawn for compensation',
      'Requires deep positional understanding',
      'Slow buildup — must be comfortable with gradual advantages'
    ],
    goals: [
      'Fianchetto the bishop to g2 for long diagonal pressure',
      'Maintain the c4/d4 center and restrict Black\'s counterplay',
      'Recover the gambit pawn (if taken) with positional compensation'
    ],
    keySquares: ['g2', 'c4', 'd5', 'e4'],
    pawnBreaks: ['e4']
  },

  // ── Indian Defenses (1. d4 Nf6) ──────────────────────────────────
  {
    id: 'kings-indian-defense',
    name: "King's Indian Defense",
    eco: 'E60',
    forSide: 'black',
    moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7',
    fen: 'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
    description: 'A dynamic defense where Black allows White to build a big center, then counterattacks with ...e5 and a kingside pawn storm.',
    advantages: [
      'Extremely dynamic — great winning chances for Black',
      'Powerful kingside attack potential',
      'The Bg7 bishop becomes very strong in the endgame'
    ],
    drawbacks: [
      'Black concedes a large center — risky if not counterattacked',
      'Requires precise timing for the ...e5 break',
      'White can get a strong queenside attack first'
    ],
    goals: [
      'Allow White to build a center, then strike with ...e5',
      'Launch a kingside pawn storm with ...f5, ...g5, ...h5',
      'Activate the bishop on g7 for long-term power'
    ],
    keySquares: ['g7', 'e5', 'f5', 'd6'],
    pawnBreaks: ['e5', 'f5', 'c5']
  },
  {
    id: 'nimzo-indian-defense',
    name: 'Nimzo-Indian Defense',
    eco: 'E20',
    forSide: 'black',
    moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4',
    fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
    description: 'One of the most respected openings in chess — Black pins the knight on c3, fighting for control of e4.',
    advantages: [
      'Immediately controls e4 by pinning c3',
      'Flexible pawn structure — many plan options',
      'Proven at the highest levels (Capablanca, Kasparov, Carlsen)'
    ],
    drawbacks: [
      'Black may have to give up the bishop pair',
      'Doubled pawns for White on c-file can be a strength too',
      'Requires understanding of many different pawn structures'
    ],
    goals: [
      'Pin the c3 knight to control the e4 square',
      'Play ...d5 or ...c5 to challenge the center',
      'Be ready to trade bishop for knight when strategically advantageous'
    ],
    keySquares: ['b4', 'e4', 'c3', 'd5'],
    pawnBreaks: ['e5', 'c5', 'd5']
  },
  {
    id: 'queens-indian-defense',
    name: "Queen's Indian Defense",
    eco: 'E12',
    forSide: 'black',
    moves: '1. d4 Nf6 2. c4 e6 3. Nf3 b6',
    fen: 'rnbqkb1r/p1pp1ppp/1p2pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 0 4',
    description: 'A flexible defense fianchettoing the queen\'s bishop to control e4 and the central light squares.',
    advantages: [
      'Very solid and flexible setup',
      'Light-squared bishop controls the long diagonal (a8-h1)',
      'Hard for White to achieve a concrete advantage'
    ],
    drawbacks: [
      'Slightly passive in some structures',
      'Black doesn\'t fight for the center as directly',
      'White can build a space advantage with e4'
    ],
    goals: [
      'Fianchetto the bishop to b7 for light-square control',
      'Contest the e4 square indirectly',
      'Aim for a solid position with counterplay based on ...d5 or ...c5'
    ],
    keySquares: ['b7', 'e4', 'b6', 'd5'],
    pawnBreaks: ['c5', 'd5', 'e5']
  },
  {
    id: 'grunfeld-defense',
    name: 'Gruenfeld Defense',
    eco: 'D80',
    forSide: 'black',
    moves: '1. d4 Nf6 2. c4 g6 3. Nc3 d5',
    fen: 'rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4',
    description: 'A hypermodern defense where Black immediately challenges d4 with ...d5, offering to give up the center for piece activity.',
    advantages: [
      'Dynamic counterplay against White\'s center',
      'The bishop on g7 becomes very powerful',
      'Rich tactical and strategic complexity'
    ],
    drawbacks: [
      'White often gets a powerful pawn center',
      'Requires precise knowledge of concrete lines',
      'Black must be comfortable defending first'
    ],
    goals: [
      'Challenge d4 immediately with ...d5',
      'Pressure the center with the fianchettoed bishop on g7',
      'Dismantle White\'s center with ...c5 and tactical strikes'
    ],
    keySquares: ['d5', 'd4', 'g7', 'c5'],
    pawnBreaks: ['c5', 'e5']
  },
  {
    id: 'benoni-defense',
    name: 'Benoni Defense',
    eco: 'A60',
    forSide: 'black',
    moves: '1. d4 Nf6 2. c4 c5 3. d5 e6',
    fen: 'rnbqkb1r/pp1p1ppp/4pn2/2pP4/2P5/8/PP2PPPP/RNBQKBNR w KQkq - 0 4',
    description: 'An ambitious defense creating an asymmetric pawn structure with queenside majority for Black.',
    advantages: [
      'Asymmetric structure creates winning chances',
      'Black gets a queenside pawn majority',
      'Dynamic piece play with the bishop on g7'
    ],
    drawbacks: [
      'White gets a strong central pawn on d5',
      'Black\'s king can be exposed in some lines',
      'Requires concrete knowledge of tactical resources'
    ],
    goals: [
      'Create a passed pawn on the queenside in the endgame',
      'Counter White\'s kingside expansion with ...f5 or ...b5',
      'Use the fianchettoed bishop and semi-open e-file'
    ],
    keySquares: ['d5', 'c5', 'e6', 'b5'],
    pawnBreaks: ['b5', 'f5', 'e5']
  },

  // ── Flank Openings ──────────────────────────────────────────
  {
    id: 'english-opening',
    name: 'English Opening',
    eco: 'A10',
    forSide: 'white',
    moves: '1. c4',
    fen: 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1',
    description: 'A flexible flank opening that controls d5 from the wing, often transposing into d4 openings.',
    advantages: [
      'Extremely flexible — can transpose into many openings',
      'Controls d5 without committing the d-pawn',
      'Avoids much of Black\'s prepared 1. e4 or 1. d4 theory'
    ],
    drawbacks: [
      'Less direct central control than 1. e4 or 1. d4',
      'Can lead to slow positional battles',
      'Black has many viable responses'
    ],
    goals: [
      'Control d5 and build a fianchettoed bishop on g2',
      'Maintain flexibility in the center (d3/d4 options)',
      'Aim for long-term positional pressure'
    ],
    keySquares: ['c4', 'd5', 'g2', 'e4'],
    pawnBreaks: ['d4', 'e4', 'b4']
  },
  {
    id: 'reti-opening',
    name: 'Reti Opening',
    eco: 'A04',
    forSide: 'white',
    moves: '1. Nf3 d5 2. c4',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2P5/5N2/PP1PPPPP/RNBQKB1R b KQkq - 0 2',
    description: 'A hypermodern opening delaying central pawn moves, developing the knight first to keep maximum flexibility.',
    advantages: [
      'Hypermodern approach — controls center from the flanks',
      'Very flexible — can transpose into English, Catalan, or d4 systems',
      'Avoids well-prepared theory from Black'
    ],
    drawbacks: [
      'Doesn\'t create immediate central tension',
      'Can lead to quiet positions if White isn\'t active',
      'Black can equalize with precise play'
    ],
    goals: [
      'Keep the center fluid and flexible',
      'Fianchetto one or both bishops (g2, b2)',
      'Strike at the center later when optimally placed'
    ],
    keySquares: ['c4', 'd5', 'g2', 'e4'],
    pawnBreaks: ['d4', 'e4']
  },
  {
    id: 'kings-indian-attack',
    name: "King's Indian Attack",
    eco: 'A07',
    forSide: 'white',
    moves: '1. Nf3 d5 2. g3',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/8/5NP1/PPPPPP1P/RNBQKB1R b KQkq - 0 2',
    description: 'A reversed King\'s Indian setup for White — fianchetto, castle kingside, then expand in the center or launch a kingside attack.',
    advantages: [
      'Universal system — can be played against almost any Black setup',
      'Low theory requirement — relies on understanding, not memorization',
      'Natural kingside attacking chances'
    ],
    drawbacks: [
      'Slow buildup — Black gets time to develop freely',
      'Less ambitious than mainline openings',
      'White gives Black a free hand in the center initially'
    ],
    goals: [
      'Fianchetto the bishop to g2 and castle quickly',
      'Push e4-e5 to gain space and cramp Black',
      'Launch a kingside attack with f4, h4, etc.'
    ],
    keySquares: ['g2', 'e4', 'e5', 'f4'],
    pawnBreaks: ['e5', 'f4', 'd4']
  },
  {
    id: 'bird-opening',
    name: "Bird's Opening",
    eco: 'A02',
    forSide: 'white',
    moves: '1. f4',
    fen: 'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq - 0 1',
    description: 'A reversed Dutch Defense for White, controlling e5 and aiming for kingside play from the first move.',
    advantages: [
      'Controls the e5 square immediately',
      'Surprise value — rarely faced at club level',
      'Can lead to aggressive kingside play'
    ],
    drawbacks: [
      'Weakens the king position (especially e1-h4 diagonal)',
      'Susceptible to the From Gambit (...e5)',
      'Less central control than 1. e4 or 1. d4'
    ],
    goals: [
      'Control e5 and build a Stonewall or Leningrad setup',
      'Fianchetto the bishop and castle kingside',
      'Expand on the kingside with pieces behind the f-pawn'
    ],
    keySquares: ['f4', 'e5', 'g2', 'd4'],
    pawnBreaks: ['f5', 'e4', 'd4']
  },
  {
    id: 'dutch-defense',
    name: 'Dutch Defense',
    eco: 'A80',
    forSide: 'black',
    moves: '1. d4 f5',
    fen: 'rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
    description: 'An ambitious defense seizing control of e4 from the first move, creating an unbalanced game.',
    advantages: [
      'Immediate fight for the e4 square',
      'Creates asymmetric, dynamic positions',
      'Good kingside attacking potential in the Stonewall and Leningrad'
    ],
    drawbacks: [
      'Weakens the kingside (especially the e8-h5 diagonal)',
      'Can be punished by early Bg5 or e4 setups',
      'Requires knowledge of specific setups (Stonewall, Leningrad, Classical)'
    ],
    goals: [
      'Control the e4 square with the f-pawn',
      'Choose a setup: Stonewall (...d5, ...e6), Leningrad (...g6, ...Bg7), or Classical',
      'Create kingside attacking chances while maintaining solid defense'
    ],
    keySquares: ['e4', 'f5', 'd5', 'g7'],
    pawnBreaks: ['e5', 'c5']
  },
  {
    id: 'alekhines-defense',
    name: "Alekhine's Defense",
    eco: 'B02',
    forSide: 'black',
    moves: '1. e4 Nf6',
    fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
    description: 'A provocative hypermodern defense inviting White to overextend the center pawns, then undermining them.',
    advantages: [
      'Provokes White into overextending the pawn center',
      'Flexible and relatively uncommon — surprise value',
      'Black gets clear targets to attack in the center'
    ],
    drawbacks: [
      'White gets a large space advantage',
      'The knight on f6 is chased around losing tempo',
      'Requires accurate play to equalize'
    ],
    goals: [
      'Invite White to push e5, d4 — creating targets',
      'Undermine the overextended center with ...d6, ...c5',
      'Counter-attack the center once White lacks piece support'
    ],
    keySquares: ['e5', 'd6', 'c5', 'f6'],
    pawnBreaks: ['d5', 'c5', 'e5']
  },
  {
    id: 'philidor-defense',
    name: 'Philidor Defense',
    eco: 'C41',
    forSide: 'black',
    moves: '1. e4 e5 2. Nf3 d6',
    fen: 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    description: 'A solid but slightly passive defense supporting e5 with ...d6, creating a resilient pawn structure.',
    advantages: [
      'Very solid pawn structure',
      'Few forced tactical lines — straightforward play',
      'Can transition to the Hanham variation for active play'
    ],
    drawbacks: [
      'Slightly passive — blocks the dark-squared bishop',
      'White gets a natural space advantage',
      'Less dynamic than alternatives like the Sicilian or French'
    ],
    goals: [
      'Maintain the e5 pawn as a central anchor',
      'Develop pieces behind the pawn chain (Nf6, Be7, O-O)',
      'Prepare ...f5 for a central or kingside break'
    ],
    keySquares: ['e5', 'd6', 'f5', 'c6'],
    pawnBreaks: ['f5', 'c5']
  },
  {
    id: 'petrov-defense',
    name: 'Petrov Defense',
    eco: 'C42',
    forSide: 'black',
    moves: '1. e4 e5 2. Nf3 Nf6',
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    description: 'A symmetrical and solid defense favored by players who want to equalize quickly and avoid sharp theory.',
    advantages: [
      'Very solid — hard for White to get an advantage',
      'Symmetric structure simplifies decision-making',
      'Good drawing weapon against stronger opponents'
    ],
    drawbacks: [
      'Can lead to drawish positions',
      'Less winning chances for Black in quiet lines',
      'Requires knowledge of some tactical traps (e.g., Stafford Gambit lines)'
    ],
    goals: [
      'Equalize quickly by mirroring White\'s setup',
      'Simplify the position and reach a balanced middlegame or endgame',
      'Avoid falling into tactical traps in the early moves'
    ],
    keySquares: ['e4', 'e5', 'd4', 'f6'],
    pawnBreaks: ['d5', 'f5']
  },
  {
    id: 'trompowsky-attack',
    name: 'Trompowsky Attack',
    eco: 'A45',
    forSide: 'white',
    moves: '1. d4 Nf6 2. Bg5',
    fen: 'rnbqkb1r/pppppppp/5n2/6B1/3P4/8/PPP1PPPP/RN1QKBNR b KQkq - 2 2',
    description: 'An aggressive system where White develops the bishop to g5 early, creating imbalances before Black settles.',
    advantages: [
      'Sidesteps most of Black\'s prepared d4-theory',
      'Creates immediate tactical tension on f6',
      'Can lead to sharp, unbalanced positions'
    ],
    drawbacks: [
      'The bishop can be challenged with ...Ne4 or ...d5',
      'White\'s development may become slightly awkward',
      'Less strategic coherence than mainline d4 systems'
    ],
    goals: [
      'Create early imbalances by trading bishop for knight or provoking weaknesses',
      'Force Black to make early decisions about pawn structure',
      'Transition into a favorable middlegame with initiative'
    ],
    keySquares: ['g5', 'f6', 'e4', 'd5'],
    pawnBreaks: ['e4', 'f4']
  },
  {
    id: 'bishops-opening',
    name: "Bishop's Opening",
    eco: 'C23',
    forSide: 'white',
    moves: '1. e4 e5 2. Bc4',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2',
    description: 'A direct opening developing the bishop to its most active square immediately, targeting f7.',
    advantages: [
      'Rapid bishop development to an aggressive square',
      'Flexible — can transpose into Italian, Vienna, or gambit lines',
      'Avoids heavy theory of 2. Nf3 lines'
    ],
    drawbacks: [
      'Delays knight development (Nf3 not yet played)',
      'Black can equalize with ...Nf6 and ...d5',
      'Less control of d4 without the knight on f3'
    ],
    goals: [
      'Develop the bishop early and target f7',
      'Maintain flexibility for f4, Nf3, or d3 plans',
      'Prepare a central or kingside attack'
    ],
    keySquares: ['c4', 'f7', 'e4', 'f4'],
    pawnBreaks: ['d4', 'f4']
  },
  {
    id: 'four-knights-game',
    name: 'Four Knights Game',
    eco: 'C47',
    forSide: 'white',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4',
    description: 'A classical and symmetrical opening where both sides develop their knights to natural squares.',
    advantages: [
      'Solid and logical development',
      'Easy to learn — both sides follow natural moves',
      'Can lead to sharp play with the Belgrade or Halloween gambits'
    ],
    drawbacks: [
      'Symmetrical nature can lead to simplified positions',
      'Less ambitious than the Italian or Ruy Lopez',
      'Black equalizes relatively easily in quiet lines'
    ],
    goals: [
      'Develop all minor pieces quickly and castle',
      'Fight for the center with d4 at the right moment',
      'Choose between quiet (Bb5) or sharp (Nd5, Bc4) plans'
    ],
    keySquares: ['e4', 'e5', 'd4', 'c3'],
    pawnBreaks: ['d4', 'f4']
  },
  {
    id: 'colle-system',
    name: 'Colle System',
    eco: 'D05',
    forSide: 'white',
    moves: '1. d4 d5 2. Nf3 Nf6 3. e3',
    fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
    description: 'A systematic and solid opening building a sturdy pawn triangle on d4-e3-c3 before launching a central break.',
    advantages: [
      'Very easy to learn — same setup against most defenses',
      'Solid pawn structure with clear plans',
      'The e4 break can create a strong kingside attack'
    ],
    drawbacks: [
      'Less ambitious than mainline d4 openings',
      'The dark-squared bishop is temporarily blocked by e3',
      'Experienced opponents can equalize comfortably'
    ],
    goals: [
      'Build the Colle pyramid: pawns on d4, e3, c3',
      'Prepare the e4 break to open the position',
      'Develop the dark-squared bishop to d3 or b2 (Colle-Zukertort)'
    ],
    keySquares: ['d4', 'e3', 'e4', 'c3'],
    pawnBreaks: ['e4', 'c4']
  },

  // ── Additional White Openings ──────────────────────────────────────
  {
    id: 'evans-gambit',
    name: 'Evans Gambit',
    eco: 'C51',
    forSide: 'white',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/1PB1P3/5N2/P1PP1PPP/RNBQK2R b KQkq - 0 4',
    description: 'A romantic gambit sacrificing a pawn to gain rapid development and a powerful center.',
    advantages: [
      'Aggressive — gains a strong center with d4 after ...Bxb4 c3',
      'Rapid development with initiative',
      'Rich tactical play and attacking chances'
    ],
    drawbacks: [
      'A real pawn sacrifice — must follow up accurately',
      'Modern defenses can neutralize the attack',
      'Requires deep knowledge of tactical resources'
    ],
    goals: [
      'Sacrifice b4 to deflect the bishop and play c3-d4',
      'Build a powerful pawn center and develop quickly',
      'Launch a kingside attack before Black consolidates'
    ],
    keySquares: ['b4', 'c3', 'd4', 'f7'],
    pawnBreaks: ['d4', 'f4'],
    isGambit: true
  },
  {
    id: 'nimzo-larsen-attack',
    name: 'Nimzo-Larsen Attack',
    eco: 'A01',
    forSide: 'white',
    moves: '1. b3',
    fen: 'rnbqkbnr/pppppppp/8/8/8/1P6/P1PPPPPP/RNBQKBNR b KQkq - 0 1',
    description: 'A hypermodern flank opening fianchettoing the queen\'s bishop to control the center from afar.',
    advantages: [
      'Highly flexible — avoids mainstream theory entirely',
      'The b2 bishop becomes very active on the long diagonal',
      'Surprise value against well-prepared opponents'
    ],
    drawbacks: [
      'Doesn\'t fight for the center directly',
      'Black can equalize with energetic central play',
      'Less forced — requires understanding of many transpositions'
    ],
    goals: [
      'Fianchetto the bishop to b2 for long diagonal pressure',
      'Control e5 and d4 indirectly',
      'Maintain a flexible structure and adapt to Black\'s setup'
    ],
    keySquares: ['b2', 'e5', 'd4', 'f3'],
    pawnBreaks: ['e4', 'd4']
  },

  // ── Additional Black Openings ──────────────────────────────────────
  {
    id: 'modern-defense',
    name: 'Modern Defense',
    eco: 'B06',
    forSide: 'black',
    moves: '1. e4 g6',
    fen: 'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    description: 'A hypermodern defense delaying ...Nf6 to fianchetto immediately, giving White maximum freedom to overextend.',
    advantages: [
      'Very flexible — avoids early theoretical commitments',
      'Fianchettoed bishop on g7 is powerful',
      'Can transpose into Pirc, King\'s Indian, or unique Modern lines'
    ],
    drawbacks: [
      'Concedes a large center — White can build e4/d4/c4',
      'Passive if Black doesn\'t counterattack energetically',
      'Requires strong positional judgment to avoid being crushed'
    ],
    goals: [
      'Fianchetto the bishop to g7 and castle quickly',
      'Strike at the center with ...d6 followed by ...e5 or ...c5',
      'Use the flexible pawn structure to create counterplay'
    ],
    keySquares: ['g7', 'e5', 'c5', 'd6'],
    pawnBreaks: ['c5', 'e5', 'd5']
  },
  {
    id: 'bogo-indian-defense',
    name: 'Bogo-Indian Defense',
    eco: 'E11',
    forSide: 'black',
    moves: '1. d4 Nf6 2. c4 e6 3. Nf3 Bb4+',
    fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 2 4',
    description: 'A solid alternative to the Nimzo-Indian, checking the king to disrupt White\'s development.',
    advantages: [
      'Solid and reliable against d4',
      'Flexible pawn structure with many plan options',
      'Less theory than the Nimzo-Indian'
    ],
    drawbacks: [
      'White can develop naturally after Bd2 or Nbd2',
      'Less control of e4 compared to the Nimzo-Indian',
      'Can lead to slightly passive positions if not played actively'
    ],
    goals: [
      'Disrupt White\'s development with the early check',
      'Play ...d5 or ...c5 to challenge the center',
      'Reach a solid position with good minor piece activity'
    ],
    keySquares: ['b4', 'e4', 'd5', 'c5'],
    pawnBreaks: ['c5', 'd5']
  },

  // ── Sharp White Openings (user-requested) ────────────────────────────────
  {
    id: 'scotch-gambit',
    name: 'Scotch Gambit',
    eco: 'C44',
    forSide: 'white',
    moves: '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Bc4',
    fen: 'r1bqkbnr/pppp1ppp/2n5/8/2BpP3/5N2/PPP2PPP/RNBQK2R b KQkq - 1 4',
    description: 'A romantic attacking gambit that blasts the center open, forcing Black to defend f7 and the advanced d4 pawn simultaneously.',
    advantages: [
      'Forces Black to defend multiple threats at once (f7 and d4)',
      'Rapid piece development with powerful bishop on c4',
      'Rich tactical complications that reward the attacker'
    ],
    drawbacks: [
      'Black holds the extra d4 pawn temporarily',
      'Requires precise follow-up with Ng5 or O-O',
      'Modern engines have found solid defensive setups'
    ],
    goals: [
      'Develop rapidly toward the kingside',
      'Pressure f7 with Bc4 and Ng5',
      'Recover the d4 pawn with initiative or launch a direct attack'
    ],
    keySquares: ['c4', 'f7', 'd4', 'e4'],
    pawnBreaks: ['d4', 'f4'],
    isGambit: true
  },
  {
    id: 'smith-morra-gambit',
    name: 'Smith-Morra Gambit',
    eco: 'B21',
    forSide: 'white',
    moves: '1. e4 c5 2. d4 cxd4 3. c3',
    fen: 'rnbqkbnr/pp1ppppp/8/8/3pP3/2P5/PP3PPP/RNBQKBNR b KQkq - 0 3',
    description: 'A pawn sacrifice against the Sicilian that gives White rapid development, open files, and attacking chances most 1200-1600 rated players struggle to handle.',
    advantages: [
      'Rapid open-file development compensates for the pawn',
      'Black must defend passively — White has a natural attacking setup',
      'Most club players are completely unprepared for it'
    ],
    drawbacks: [
      'A real pawn sacrifice — solid Sicilian players can hold the material',
      'White\'s compensation requires accurate piece coordination',
      'Less effective against experienced Smith-Morra defenders'
    ],
    goals: [
      'Recapture with dxc3 and develop Nc3, Nf3, Bc4 rapidly',
      'Open files and diagonals for a central and kingside attack',
      'Exploit Black\'s underdeveloped queenside before it comes to life'
    ],
    keySquares: ['c4', 'd4', 'e4', 'f7'],
    pawnBreaks: ['e5', 'f4'],
    isGambit: true
  },
  {
    id: 'milner-barry-gambit',
    name: 'Milner-Barry Gambit',
    eco: 'C02',
    forSide: 'white',
    moves: '1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Qb6 6. Bd3',
    fen: 'r1b1kbnr/pp3ppp/1qn1p3/2ppP3/3P4/2PB1N2/PP3PPP/RNBQK2R b KQkq - 1 6',
    description: 'In the French Advance, White sacrifices the d4 pawn to keep Black\'s king stuck in the center and launch a devastating kingside attack.',
    advantages: [
      'Sacrificing d4 keeps Black\'s king centralized and exposed',
      'White develops rapidly with a massive kingside initiative',
      'Black\'s queen on b6 is misplaced and far from the kingside defense'
    ],
    drawbacks: [
      'White is objectively worse with correct defensive play',
      'Requires sharp tactical calculation to make the attack work',
      'Black can defuse with accurate piece coordination'
    ],
    goals: [
      'Sacrifice d4 willingly to open lines toward the king',
      'Castle queenside to activate the rook on the d-file',
      'Force the Black king to remain stuck on e8 while attacking'
    ],
    keySquares: ['d4', 'e5', 'd3', 'f7'],
    pawnBreaks: ['f4', 'g4'],
    isGambit: true
  },
  {
    id: 'caro-kann-advance-tal',
    name: 'Advance Caro-Kann (Tal Var.)',
    eco: 'B12',
    forSide: 'white',
    moves: '1. e4 c6 2. d4 d5 3. e5 Bf5 4. h4',
    fen: 'rn1qkbnr/pp2pppp/2p5/3pPb2/3P3P/8/PPP2PP1/RNBQKBNR b KQkq - 0 4',
    description: 'Play 3.e5 then 4.h4! to hunt the light-squared bishop and create a kingside pawn storm before Black can consolidate.',
    advantages: [
      'Immediately targets the Bf5 bishop with h4-h5',
      'Creates a kingside space advantage and attacking potential',
      'Black\'s usual Caro-Kann plan is severely disrupted'
    ],
    drawbacks: [
      'Weakens the g4 and g3 squares',
      'The h-pawn advance can overextend if Black defends correctly',
      'Requires follow-up knowledge of g4 and h5 plans'
    ],
    goals: [
      'Chase the bishop with h4-h5 and force it to a passive square',
      'Build a kingside space advantage with g4-g5',
      'Launch a pawn storm while Black has poor piece coordination'
    ],
    keySquares: ['e5', 'f5', 'h4', 'g4'],
    pawnBreaks: ['g4', 'h5']
  },
  {
    id: 'mieses-gambit',
    name: 'Mieses Gambit',
    eco: 'B01',
    forSide: 'white',
    moves: '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. b4',
    fen: 'rnb1kbnr/ppp1pppp/8/q7/1P6/2N5/P1PP1PPP/R1BQKBNR b KQkq - 0 4',
    description: 'A Wing Gambit against the Scandinavian: after 3...Qa5, play 4.b4! to sacrifice a pawn, ruin Black\'s setup, and seize the initiative.',
    advantages: [
      'Destroys Black\'s usual Scandinavian structure and plans',
      'Queenside expansion gives White rapid space and initiative',
      'Black\'s queen is suddenly under fire and completely misplaced'
    ],
    drawbacks: [
      'White gives up a real pawn with no immediate recovery',
      'Black can accept and try to hold the extra material',
      'Requires concrete follow-up — White must attack quickly'
    ],
    goals: [
      'After ...Qxb4, play Rb1 to trap or chase the queen',
      'Open files on the queenside with a4 and b5 advances',
      'Develop rapidly and attack before Black consolidates'
    ],
    keySquares: ['b4', 'a5', 'c3', 'd5'],
    pawnBreaks: ['a4', 'd4'],
    isGambit: true
  },
  {
    id: 'austrian-attack-pirc',
    name: 'Austrian Attack (Pirc/Modern)',
    eco: 'B09',
    forSide: 'white',
    moves: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. f4',
    fen: 'rnbqkb1r/ppp1pp1p/3p1np1/8/3PPP2/2N5/PPP3PP/R1BQKBNR b KQkq - 0 4',
    description: 'Build a massive 3-pawn center (e4, d4, f4) against the Pirc/Modern and simply steamroll. Black\'s hypermodern counter-attacking plan gets overwhelmed by sheer space.',
    advantages: [
      'Three-pawn center creates enormous space advantage',
      'Direct kingside attack with f4-f5 is concrete and difficult to meet',
      'Black\'s typical counter with ...e5 or ...c5 runs into tactical problems'
    ],
    drawbacks: [
      'The center can become a target if over-extended',
      'Requires precise piece coordination to support the advance',
      'Black has specific defensive setups that challenge the center'
    ],
    goals: [
      'Advance f4-f5 to blast open the kingside',
      'Support the center with Be2 and Nf3 before advancing',
      'Castle kingside and use the open f-file for a direct attack'
    ],
    keySquares: ['e4', 'f4', 'f5', 'd4'],
    pawnBreaks: ['f5', 'e5']
  },

  // ── Sharp Black Openings (user-requested) ────────────────────────────────
  {
    id: 'sicilian-dragon',
    name: 'Sicilian Dragon',
    eco: 'B70',
    forSide: 'black',
    moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6',
    fen: 'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
    description: 'Pure tactical race: Black uses the g7 bishop to tear open White\'s queenside while White storms the kingside. The most aggressive Sicilian variation.',
    advantages: [
      'The Bg7 bishop becomes a monster on the long diagonal',
      'Classic mutual castling opposite sides creates a tactical race',
      'Rich theory with well-tested attacking motifs for Black'
    ],
    drawbacks: [
      'White\'s Yugoslav Attack (Be3, f3, g4) is extremely dangerous',
      'One mistake in the main lines can be immediately fatal',
      'Heavy theory requirement in the critical Yugoslav lines'
    ],
    goals: [
      'Castle queenside to create a tactical race against the White king',
      'Use the Bg7 to pressure d4 and tear open the queenside with ...b5',
      'Coordinate rooks on c8 and d8 for maximum queenside pressure'
    ],
    keySquares: ['g7', 'd4', 'b5', 'c4'],
    pawnBreaks: ['b5', 'd5']
  },
  {
    id: 'benko-gambit',
    name: 'Benko Gambit',
    eco: 'A57',
    forSide: 'black',
    moves: '1. d4 Nf6 2. c4 c5 3. d5 b5',
    fen: 'rnbqkb1r/p2ppppp/5n2/1ppP4/2P5/8/PP2PPPP/RNBQKBNR w KQkq b6 0 4',
    description: 'Sacrifice a pawn for permanent, annoying queenside pressure. The a-file and b-file become Black\'s highways for long-term positional compensation.',
    advantages: [
      'Semi-permanent queenside compensation — hard for White to return',
      'Black gets open a and b files for rooks without using extra tempos',
      'A well-tested tournament weapon with clear strategic plans'
    ],
    drawbacks: [
      'White can decline and simply get a space advantage',
      'The pawn sacrifice requires understanding of queenside pressure',
      'White can choose quieter variations to avoid the main lines'
    ],
    goals: [
      'Open the a and b files after ...bxc4 and ...axb5',
      'Place rooks on a8 and b8 for maximum queenside pressure',
      'Use the fianchettoed Bg7 to support the queenside counterplay'
    ],
    keySquares: ['b5', 'a6', 'g7', 'b2'],
    pawnBreaks: ['e6', 'f5'],
    isGambit: true
  },
  {
    id: 'leningrad-dutch',
    name: 'Leningrad Dutch',
    eco: 'A86',
    forSide: 'black',
    moves: '1. d4 f5 2. c4 Nf6 3. g3 g6 4. Bg2 Bg7',
    fen: 'rnbqk2r/ppppp1bp/5np1/5p2/2PP4/6P1/PP2PPBP/RNBQK1NR w KQkq - 2 5',
    description: 'The most aggressive way to fight 1.d4. You fight for the e4 square from move 1 with f5 and set up a powerful kingside structure with g6, Bg7, and Nf6.',
    advantages: [
      'Active fighting stance against d4 from the first move',
      'Powerful kingside structure with Bg7 and the f5-g6 pawn duo',
      'Black can launch a kingside attack before White activates the queenside'
    ],
    drawbacks: [
      'The f5 pawn weakens e5 and the e8-h5 diagonal',
      'Requires careful handling of the Staunton Gambit (2.e4)',
      'White can get a dangerous center with e4 in some lines'
    ],
    goals: [
      'Fianchetto the bishop to g7 for kingside control',
      'Fight for the e4 square with ...d6 and ...Nc6 or ...e5',
      'Launch a kingside attack with ...h5 and ...Ng4 plans'
    ],
    keySquares: ['e4', 'f5', 'g7', 'd5'],
    pawnBreaks: ['e5', 'd5']
  },
  {
    id: 'reversed-sicilian-english',
    name: 'Reversed Sicilian',
    eco: 'A25',
    forSide: 'black',
    moves: '1. c4 e5',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w KQkq e6 0 2',
    description: 'Play 1...e5 against the English Opening and treat it like you are playing the White side of a Sicilian — with familiar attacking ideas and an extra tempo.',
    advantages: [
      'Familiar Sicilian-style positions but with an extra tempo',
      'Active piece play with natural development toward the center',
      'White has no forcing lines — Black dictates the pace'
    ],
    drawbacks: [
      'White has flexible transposition options (e4 to reach an Open Sicilian)',
      'Less concrete theory means less concrete winning plans',
      'Positions can become symmetrical and drawish in quiet lines'
    ],
    goals: [
      'Develop naturally with ...Nc6, ...Nf6, ...d6 or ...Bc5',
      'Exploit familiar Sicilian themes: d5 break, f5 advance, queenside pressure',
      'Use the extra tempo to seize the initiative over White'
    ],
    keySquares: ['e5', 'd4', 'c4', 'f4'],
    pawnBreaks: ['d5', 'f5']
  },
  {
    id: 'kings-indian-setup-reti',
    name: "King's Indian Setup (vs Reti)",
    eco: 'A48',
    forSide: 'black',
    moves: '1. Nf3 d6 2. g3 g6 3. Bg2 Bg7 4. O-O Nf6',
    fen: 'rnbqk2r/ppp1ppbp/3p1np1/8/8/5NPP/PPPPPPB1/RNBQ1RK1 w kq - 4 5',
    description: 'Use your King\'s Indian Defense knowledge against the Reti, fianchettoing to g7 and looking for the e5 break much faster than White can prepare against it.',
    advantages: [
      'Mirror White\'s hypermodern setup with familiar KID plans',
      'The Bg7 exerts immediate pressure on d4 and e5',
      'The ...e5 break arrives faster since White has not committed with d4'
    ],
    drawbacks: [
      'White can choose a flexible non-committal setup to avoid the main lines',
      'Black must switch plans if White avoids the standard KID structure',
      'Less forcing than the main-line KID against 1.d4'
    ],
    goals: [
      'Establish the KID structure: g6, Bg7, d6, Nf6, castle kingside',
      'Break with ...e5 when well-timed to challenge the center',
      'Use the Bg7 on the long diagonal to dominate positionally'
    ],
    keySquares: ['g7', 'e5', 'd4', 'f5'],
    pawnBreaks: ['e5', 'c5']
  },
  {
    id: 'budapest-gambit',
    name: 'Budapest Gambit',
    eco: 'A51',
    forSide: 'black',
    moves: '1. d4 Nf6 2. c4 e5',
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2PP4/8/PP2PPPP/RNBQKBNR w KQkq e6 0 3',
    description: 'A surprise gambit against 1.d4 — sacrifice the e5 pawn immediately for rapid development, pressure on d4, and an initiative that White never quite expected.',
    advantages: [
      'Excellent surprise value — most d4 players are unprepared',
      'Immediate piece activity and pressure on the d4 pawn',
      'Black\'s compensation is positional and long-lasting'
    ],
    drawbacks: [
      'White can consolidate the extra pawn with careful play',
      'Less popular at GM level — objectively below equality',
      'Requires faith in positional compensation over raw material'
    ],
    goals: [
      'Recover the pawn with active piece play or keep the initiative',
      'Use rapid development (Nc6, Bc5, Bg4) to pressure White',
      'Target the d4 pawn as the weak point in White\'s structure'
    ],
    keySquares: ['d4', 'e5', 'f2', 'c5'],
    pawnBreaks: ['d5', 'f5'],
    isGambit: true
  },
];

export const SIDE_LABELS: Record<string, string> = {
  'white': 'White Openings',
  'black': 'Black Openings'
};
