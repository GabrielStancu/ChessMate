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
    keySquares: ['c4', 'f7', 'd4', 'e4']
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
    keySquares: ['b5', 'e5', 'd4', 'f5']
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
    keySquares: ['d4', 'c5', 'e5', 'd5']
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
    keySquares: ['d5', 'e4', 'c5', 'f5']
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
    keySquares: ['d5', 'e4', 'c6', 'e6']
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
    keySquares: ['d5', 'e4', 'd4', 'c6']
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
    keySquares: ['g7', 'e5', 'c5', 'd4']
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
    keySquares: ['f4', 'f7', 'e5', 'd4']
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
    keySquares: ['d4', 'e5', 'c3', 'f4']
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
    keySquares: ['e4', 'f4', 'c3', 'd5']
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
    keySquares: ['c4', 'd5', 'e4', 'd4']
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
    keySquares: ['d5', 'e6', 'c5', 'e5']
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
    keySquares: ['d5', 'c6', 'f5', 'e6']
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
    keySquares: ['f4', 'd4', 'e3', 'c3']
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
    keySquares: ['g2', 'c4', 'd5', 'e4']
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
    keySquares: ['g7', 'e5', 'f5', 'd6']
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
    keySquares: ['b4', 'e4', 'c3', 'd5']
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
    keySquares: ['b7', 'e4', 'b6', 'd5']
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
    keySquares: ['d5', 'd4', 'g7', 'c5']
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
    keySquares: ['d5', 'c5', 'e6', 'b5']
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
    keySquares: ['c4', 'd5', 'g2', 'e4']
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
    keySquares: ['c4', 'd5', 'g2', 'e4']
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
    keySquares: ['g2', 'e4', 'e5', 'f4']
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
    keySquares: ['f4', 'e5', 'g2', 'd4']
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
    keySquares: ['e4', 'f5', 'd5', 'g7']
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
    keySquares: ['e5', 'd6', 'c5', 'f6']
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
    keySquares: ['e5', 'd6', 'f5', 'c6']
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
    keySquares: ['e4', 'e5', 'd4', 'f6']
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
    keySquares: ['g5', 'f6', 'e4', 'd5']
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
    keySquares: ['c4', 'f7', 'e4', 'f4']
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
    keySquares: ['e4', 'e5', 'd4', 'c3']
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
    keySquares: ['d4', 'e3', 'e4', 'c3']
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
    keySquares: ['b4', 'c3', 'd4', 'f7']
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
    keySquares: ['b2', 'e5', 'd4', 'f3']
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
    keySquares: ['g7', 'e5', 'c5', 'd6']
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
    keySquares: ['b4', 'e4', 'd5', 'c5']
  },
];

export const SIDE_LABELS: Record<string, string> = {
  'white': 'White Openings',
  'black': 'Black Openings'
};
