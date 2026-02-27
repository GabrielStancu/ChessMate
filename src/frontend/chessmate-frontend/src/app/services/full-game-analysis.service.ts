import { Injectable, inject, signal } from '@angular/core';
import { Chess, Move } from 'chess.js';
import { ClassifiedMove, FullGameAnalysisResult, MoveContext, PIECE_VALUES } from '../models/classification.models';
import { AnalysisMode, EngineConfig, PositionEvaluation } from '../models/analysis.models';
import { StockfishAnalysisControllerService } from './stockfish-analysis-controller.service';
import { OpeningBookService } from './opening-book.service';
import { centipawnToWinExpectancy, classifyMove, flipWinExpectancy } from '../utils/win-expectancy.utils';

export interface AnalysisProgress {
  current: number;
  total: number;
  phase: 'loading' | 'evaluating' | 'classifying' | 'coaching' | 'done' | 'error';
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class FullGameAnalysisService {
  private readonly stockfish = inject(StockfishAnalysisControllerService);
  private readonly openingBook = inject(OpeningBookService);

  public readonly progress = signal<AnalysisProgress>({ current: 0, total: 0, phase: 'loading' });

  /**
   * Run full-game Stockfish analysis and classify every move.
   *
   * @param pgn          The PGN string of the game
   * @param gameId       Unique game identifier
   * @param username     The searched Chess.com username (to determine player color)
   * @param mode         Analysis mode (quick/deep)
   * @param config       Engine configuration
   * @param initialFen   Optional starting FEN for non-standard positions
   */
  public async analyzeGame(
    pgn: string,
    gameId: string,
    username: string,
    mode: AnalysisMode,
    config: EngineConfig,
    initialFen?: string
  ): Promise<FullGameAnalysisResult> {
    this.progress.set({ current: 0, total: 0, phase: 'loading' });

    await this.openingBook.preload();

    const timeline = this.buildTimeline(pgn, initialFen);
    if (!timeline) {
      const errorResult: AnalysisProgress = { current: 0, total: 0, phase: 'error', errorMessage: 'Failed to parse PGN.' };
      this.progress.set(errorResult);
      throw new Error('Failed to parse PGN for full-game analysis.');
    }

    const playerColor = this.detectPlayerColor(pgn, username);
    const totalMoves = timeline.moves.length;
    const totalPositions = timeline.positions.length;

    this.progress.set({ current: 0, total: totalPositions, phase: 'evaluating' });

    const evaluations = await this.evaluateAllPositions(timeline.positions, config);

    this.progress.set({ current: 0, total: totalMoves, phase: 'classifying' });

    const classifiedMoves = this.classifyAllMoves(
      timeline.moves,
      timeline.positions,
      evaluations,
      playerColor
    );

    this.progress.set({ current: totalMoves, total: totalMoves, phase: 'done' });

    return {
      gameId,
      playerColor,
      classifiedMoves,
      engineConfig: { depth: config.depth, threads: config.threads, timePerMoveMs: config.timePerMoveMs },
      analysisMode: mode,
      totalPositions,
      analyzedAt: new Date().toISOString()
    };
  }

  private buildTimeline(
    pgn: string,
    startFen?: string
  ): { positions: string[]; moves: Move[] } | null {
    const game = startFen ? new Chess(startFen) : new Chess();

    try {
      game.loadPgn(pgn, { strict: false });
    } catch {
      return null;
    }

    const history = game.history({ verbose: true });

    while (game.history().length > 0) {
      game.undo();
    }

    const initialFen = game.fen();
    const positions: string[] = [initialFen];
    const replay = new Chess(initialFen);
    const moves: Move[] = [];

    for (const move of history) {
      const applied = replay.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || undefined
      });

      if (!applied) {
        return null;
      }

      positions.push(replay.fen());
      moves.push(applied);
    }

    return { positions, moves };
  }

  private detectPlayerColor(pgn: string, username: string): 'white' | 'black' {
    const normalizedUsername = username.toLowerCase();

    const whiteMatch = pgn.match(/\[White\s+"([^"]+)"\]/i);
    const blackMatch = pgn.match(/\[Black\s+"([^"]+)"\]/i);

    if (whiteMatch && whiteMatch[1].toLowerCase() === normalizedUsername) {
      return 'white';
    }

    if (blackMatch && blackMatch[1].toLowerCase() === normalizedUsername) {
      return 'black';
    }

    return 'white';
  }

  private async evaluateAllPositions(
    positions: string[],
    config: EngineConfig
  ): Promise<PositionEvaluation[]> {
    const evaluations: PositionEvaluation[] = [];

    for (let i = 0; i < positions.length; i++) {
      this.progress.set({ current: i + 1, total: positions.length, phase: 'evaluating' });

      try {
        const evaluation = await this.stockfish.evaluatePosition(positions[i], config);
        evaluations.push(evaluation);
      } catch (error) {
        evaluations.push({
          fen: positions[i],
          bestMove: null,
          centipawn: 0,
          mate: null,
          depth: null,
          principalVariation: null,
          cached: false
        });
      }
    }

    return evaluations;
  }

  private classifyAllMoves(
    moves: Move[],
    positions: string[],
    evaluations: PositionEvaluation[],
    playerColor: 'white' | 'black'
  ): ClassifiedMove[] {
    const classifiedMoves: ClassifiedMove[] = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const ply = i + 1;
      const isWhiteMove = ply % 2 === 1;
      const isUserMove = (isWhiteMove && playerColor === 'white') || (!isWhiteMove && playerColor === 'black');

      const evalBefore = evaluations[i];
      const evalAfter = evaluations[i + 1];

      const cpBefore = this.resolveCentipawn(evalBefore);
      const cpAfter = this.resolveCentipawn(evalAfter);

      const weBefore = centipawnToWinExpectancy(cpBefore);
      const weAfter = centipawnToWinExpectancy(cpAfter);

      // Stockfish always evaluates from the side-to-move's perspective.
      // Before the move: side-to-move = moving side → cpBefore IS the moving side's eval.
      // After the move: side-to-move = opponent → flip to get the moving side's eval.
      const weBeforeForMovingSide = weBefore;
      const weAfterForMovingSide = flipWinExpectancy(weAfter);

      const cpMovingSideBefore = cpBefore;
      const cpMovingSideAfter = -cpAfter;

      const uciMove = `${move.from}${move.to}${move.promotion || ''}`;
      const bestMoveUci = evalBefore.bestMove;
      const isBestMove = bestMoveUci !== null && uciMove.toLowerCase() === bestMoveUci.toLowerCase();

      const positionBeforeMove = positions[i];
      const isBookMove = this.openingBook.isBookPositionSync(positionBeforeMove);

      const moveContext: MoveContext = {
        piece: move.piece,
        captured: move.captured,
        cpMovingSideBefore,
        cpMovingSideAfter,
        ply,
        isSacrifice: this.detectSacrifice(move, positions[i + 1])
      };

      const classification = classifyMove(weBeforeForMovingSide, weAfterForMovingSide, isBestMove, isBookMove, moveContext);

      const weLoss = weBeforeForMovingSide - weAfterForMovingSide;
      const cpLoss = cpMovingSideBefore - cpMovingSideAfter;

      classifiedMoves.push({
        ply,
        san: move.san,
        from: move.from,
        to: move.to,
        piece: move.piece,
        isUserMove,
        classification,
        winExpectancyBefore: weBeforeForMovingSide,
        winExpectancyAfter: weAfterForMovingSide,
        winExpectancyLoss: Math.max(0, weLoss),
        bestMove: bestMoveUci,
        opponentBestResponse: evalAfter.bestMove,
        centipawnBefore: cpBefore,
        centipawnAfter: cpAfter,
        centipawnLoss: Math.max(0, cpLoss),
        fenBefore: positions[i],
        fenAfter: positions[i + 1]
      });

      this.progress.set({ current: i + 1, total: moves.length, phase: 'classifying' });
    }

    return classifiedMoves;
  }

  /**
   * Resolve centipawn from evaluation, handling mate scores.
   * Mate-in-N is treated as a large centipawn advantage.
   */
  private resolveCentipawn(evaluation: PositionEvaluation): number {
    if (evaluation.mate !== null) {
      return evaluation.mate > 0 ? 10_000 : -10_000;
    }

    return evaluation.centipawn ?? 0;
  }

  /**
   * Detect whether a move is a true material sacrifice using
   * Static Exchange Evaluation (SEE).
   *
   * Simulates the best sequence of captures on the destination square
   * (each side always using their least valuable available attacker)
   * and determines whether the side that placed the piece loses material.
   *
   * Returns true only when SEE < 0 — meaning the piece is lost or traded
   * down even when both sides play optimally on that square.
   *
   * Examples where SEE correctly returns false (NOT a sacrifice):
   *   - Knight captures pawn on a square defended by own pawn → opponent
   *     recaptures, player recaptures → exchange is even or favorable.
   *   - Piece captures on a square attacked by opponent but also defended
   *     by player pieces of equal or lesser value.
   */
  private detectSacrifice(move: Move, fenAfterMove: string): boolean {
    if (move.piece === 'p' || move.piece === 'k') {
      return false;
    }

    try {
      const see = this.computeStaticExchangeEvaluation(
        fenAfterMove,
        move.to,
        PIECE_VALUES[move.piece] ?? 0
      );

      // Credit material gained from the initial capture.
      // e.g. Bxd5 capturing knight: SEE = -3 (bishop lost) + 3 (knight gained) = 0 → NOT a sacrifice.
      // e.g. Qxf2 capturing pawn:   SEE = -9 (queen lost)  + 1 (pawn gained)   = -8 → sacrifice.
      const capturedValue = move.captured ? (PIECE_VALUES[move.captured] ?? 0) : 0;
      const netMaterial = see + capturedValue;

      return netMaterial < 0;
    } catch {
      return false;
    }
  }

  /**
   * Static Exchange Evaluation (SEE).
   *
   * Starting from a position where a piece of known value sits on the
   * target square, simulates the optimal sequence of captures by both
   * sides (always using the least valuable attacker) and returns the
   * net material score from the perspective of the side that placed
   * the piece.
   *
   * Algorithm:
   *   1. Build a gain[] array by simulating captures with the least
   *      valuable available attacker on each turn.
   *   2. Evaluate backwards with negamax: each side only initiates a
   *      capture if the material gained exceeds the opponent's best
   *      subsequent exchange result.
   *
   * @returns Negative → sacrifice (piece is lost).
   *          Zero or positive → piece survives or exchange is favorable.
   */
  private computeStaticExchangeEvaluation(
    fen: string,
    targetSquare: string,
    pieceOnSquareValue: number
  ): number {
    const board = new Chess(fen);
    const gains: number[] = [];
    let currentPieceValue = pieceOnSquareValue;

    for (let depth = 0; depth < 32; depth++) {
      const captures = board
        .moves({ verbose: true })
        .filter((m: Move) => m.to === targetSquare && m.captured != null);

      if (captures.length === 0) {
        break;
      }

      // Pick the least valuable attacker
      captures.sort(
        (a: Move, b: Move) => (PIECE_VALUES[a.piece] ?? 0) - (PIECE_VALUES[b.piece] ?? 0)
      );
      const leastValuable = captures[0];

      // The capturing side gains the value of the piece currently on the square
      gains.push(currentPieceValue);

      // The capturing piece now sits on the square
      currentPieceValue = PIECE_VALUES[leastValuable.piece] ?? 0;

      board.move(leastValuable.san);
    }

    // Negamax backwards: each side only captures if profitable.
    // d[n] = 0;  d[i] = max(0, gains[i] - d[i+1])
    let score = 0;
    for (let i = gains.length - 1; i >= 0; i--) {
      score = Math.max(0, gains[i] - score);
    }

    // score = what the first capturer (opponent) gains from the exchange.
    // The moving side's perspective is the negative.
    return -score;
  }
}
