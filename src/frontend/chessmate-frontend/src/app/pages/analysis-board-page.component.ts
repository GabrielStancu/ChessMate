import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { BORDER_TYPE, Chessboard, FEN } from 'cm-chessboard/src/Chessboard.js';
import { AnalysisMetadata, AnalysisMode, EngineConfig, PositionEvaluation, StaleEvaluationError } from '../models/analysis.models';
import { GetGamesItemEnvelope } from '../models/games.models';
import { AnalysisSessionService } from '../services/analysis-session.service';
import { StockfishAnalysisControllerService } from '../services/stockfish-analysis-controller.service';

interface MoveStep {
  moveNumber: number;
  san: string;
}

@Component({
  selector: 'app-analysis-board-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './analysis-board-page.component.html',
  styleUrl: './analysis-board-page.component.css'
})
export class AnalysisBoardPageComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly analysisSessionService = inject(AnalysisSessionService);
  private readonly analysisController = inject(StockfishAnalysisControllerService);

  @ViewChild('boardHost')
  private boardHost?: ElementRef<HTMLDivElement>;

  private chessboard: Chessboard | null = null;
  private readonly gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
  private currentEvaluationRequest = 0;

  protected readonly availableModes: ReadonlyArray<{ label: string; value: AnalysisMode }> = [
    { label: 'Quick', value: 'quick' },
    { label: 'Deep', value: 'deep' }
  ];
  protected readonly mode = signal<AnalysisMode>('quick');
  protected readonly engineConfig = signal<EngineConfig>(this.analysisController.getPreset('quick'));
  protected readonly game = signal<GetGamesItemEnvelope | null>(this.resolveGame());
  protected readonly moveSteps = signal<MoveStep[]>([]);
  protected readonly positionTimeline = signal<string[]>([FEN.start]);
  protected readonly selectedPositionIndex = signal(0);
  protected readonly evaluating = signal(false);
  protected readonly evaluationError = signal<string | null>(null);
  protected readonly evaluation = signal<PositionEvaluation | null>(null);
  protected readonly configError = signal<string | null>(null);
  protected readonly timelineWarning = signal<string | null>(null);
  protected readonly engineWarning = signal<string | null>(null);
  protected readonly currentFen = computed(
    () => this.positionTimeline()[Math.min(this.selectedPositionIndex(), this.positionTimeline().length - 1)]
  );
  protected readonly canGoPrevious = computed(() => this.selectedPositionIndex() > 0);
  protected readonly canGoNext = computed(() => this.selectedPositionIndex() < this.positionTimeline().length - 1);
  protected readonly analysisMetadata = computed<AnalysisMetadata>(() => ({
    mode: this.mode(),
    engineConfig: this.engineConfig()
  }));

  public constructor() {
    const activeGame = this.game();
    if (!activeGame) {
      void this.router.navigate(['/']);
      return;
    }

    this.loadTimeline(activeGame);
    if (this.positionTimeline().length <= 1) {
      void this.tryHydrateTimelineFromGameUrl(activeGame);
    }

    effect(() => {
      const fen = this.currentFen();
      void this.syncBoardPosition(fen);
      void this.runEvaluation(fen);
    }, { allowSignalWrites: true });

    this.destroyRef.onDestroy(() => {
      this.analysisController.cancelInFlightEvaluation();
    });
  }

  public ngAfterViewInit(): void {
    if (!this.boardHost) {
      return;
    }

    this.chessboard = new Chessboard(this.boardHost.nativeElement, {
      position: this.currentFen(),
      assetsUrl: 'assets/cm-chessboard/',
      style: {
        borderType: BORDER_TYPE.frame,
        showCoordinates: true
      }
    });
  }

  public ngOnDestroy(): void {
    this.chessboard?.destroy();
    this.chessboard = null;
  }

  protected setMode(mode: AnalysisMode): void {
    this.mode.set(mode);
    this.engineConfig.set(this.analysisController.getPreset(mode));
    this.configError.set(null);
    this.evaluation.set(null);
    void this.runEvaluation(this.currentFen());
  }

  protected updateDepth(value: number): void {
    this.tryUpdateEngineConfig({ depth: Number(value) });
  }

  protected updateThreads(value: number): void {
    this.tryUpdateEngineConfig({ threads: Number(value) });
  }

  protected updateTimePerMove(value: number): void {
    this.tryUpdateEngineConfig({ timePerMoveMs: Number(value) });
  }

  protected goFirst(): void {
    this.selectedPositionIndex.set(0);
  }

  protected goPrevious(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.selectedPositionIndex.set(this.selectedPositionIndex() - 1);
  }

  protected goNext(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.selectedPositionIndex.set(this.selectedPositionIndex() + 1);
  }

  protected goLast(): void {
    this.selectedPositionIndex.set(this.positionTimeline().length - 1);
  }

  protected moveLabel(): string {
    const index = this.selectedPositionIndex();
    if (index === 0) {
      return 'Initial position';
    }

    const step = this.moveSteps()[index - 1];
    if (!step) {
      return `Move ${index}`;
    }

    return `${step.moveNumber}. ${step.san}`;
  }

  protected formatBestMoveForDisplay(bestMove: string | null, fen: string): string {
    if (!bestMove) {
      return 'N/A';
    }

    const normalizedMove = bestMove.trim().toLowerCase();
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(normalizedMove)) {
      return bestMove;
    }

    const from = normalizedMove.slice(0, 2);
    const to = normalizedMove.slice(2, 4);
    const promotion = normalizedMove.length === 5 ? normalizedMove[4] : undefined;

    try {
      const board = new Chess(fen);
      const applied = board.move({
        from,
        to,
        promotion
      });

      return applied?.san || bestMove;
    } catch {
      return bestMove;
    }
  }

  private resolveGame(): GetGamesItemEnvelope | null {
    if (!this.gameId) {
      return null;
    }

    return this.analysisSessionService.getSelectedGame(this.gameId);
  }

  private loadTimeline(game: GetGamesItemEnvelope): void {
    const fallbackInitialFen = game.initialFen?.trim() || FEN.start;

    const pgn = game.pgn?.trim();
    if (!pgn) {
      this.positionTimeline.set([fallbackInitialFen]);
      this.moveSteps.set([]);
      return;
    }

    const parsedFromPgn = this.tryBuildTimelineFromPgn(pgn);
    if (parsedFromPgn) {
      this.positionTimeline.set(parsedFromPgn.positions);
      this.moveSteps.set(parsedFromPgn.steps);
      return;
    }

    const parsedWithInitialFen = game.initialFen?.trim()
      ? this.tryBuildTimelineFromPgn(pgn, game.initialFen.trim())
      : null;

    if (parsedWithInitialFen) {
      this.positionTimeline.set(parsedWithInitialFen.positions);
      this.moveSteps.set(parsedWithInitialFen.steps);
      return;
    }

    this.positionTimeline.set([fallbackInitialFen]);
    this.moveSteps.set([]);
  }

  private tryBuildTimelineFromPgn(
    pgn: string,
    startFen?: string
  ): { positions: string[]; steps: MoveStep[] } | null {
    const loadedGame = startFen ? new Chess(startFen) : new Chess();

    try {
      loadedGame.loadPgn(pgn, { strict: false });
    } catch {
      return null;
    }

    const history = loadedGame.history({ verbose: true });

    while (loadedGame.history().length > 0) {
      loadedGame.undo();
    }

    const initialFen = loadedGame.fen();
    const positions: string[] = [initialFen];
    const steps: MoveStep[] = [];
    const replay = new Chess(initialFen);

    for (let index = 0; index < history.length; index++) {
      const move = history[index];
      const appliedMove = replay.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || undefined
      });

      if (!appliedMove) {
        return null;
      }

      positions.push(replay.fen());
      steps.push({
        moveNumber: Math.floor(index / 2) + 1,
        san: move.san
      });
    }

    return {
      positions,
      steps
    };
  }

  private async tryHydrateTimelineFromGameUrl(game: GetGamesItemEnvelope): Promise<void> {
    const gameUrl = game.url?.trim();
    if (!gameUrl) {
      this.timelineWarning.set('Move navigation is unavailable because no PGN is available for this game.');
      return;
    }

    const pgnUrl = this.buildPgnUrl(gameUrl);

    try {
      const response = await fetch(pgnUrl, {
        headers: {
          Accept: 'application/x-chess-pgn,text/plain;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        this.timelineWarning.set('Move navigation is unavailable because PGN could not be loaded.');
        return;
      }

      const pgn = (await response.text()).trim();
      if (!pgn) {
        this.timelineWarning.set('Move navigation is unavailable because PGN could not be loaded.');
        return;
      }

      this.timelineWarning.set(null);
      this.loadTimeline({
        ...game,
        pgn
      });
      this.selectedPositionIndex.set(0);
      this.evaluation.set(null);
      this.evaluationError.set(null);
    } catch {
      this.timelineWarning.set('Move navigation is unavailable because PGN could not be loaded.');
    }
  }

  private buildPgnUrl(gameUrl: string): string {
    if (gameUrl.endsWith('/pgn')) {
      return gameUrl;
    }

    return `${gameUrl.replace(/\/+$/, '')}/pgn`;
  }

  private tryUpdateEngineConfig(partial: Partial<EngineConfig>): void {
    this.evaluationError.set(null);
    this.configError.set(null);

    try {
      const merged = {
        ...this.engineConfig(),
        ...partial
      };
      const validated = this.analysisController.validateEngineConfig(merged);
      this.engineConfig.set(validated);
      this.evaluation.set(null);
      void this.runEvaluation(this.currentFen());
    } catch (error) {
      this.configError.set(error instanceof Error ? error.message : 'Engine configuration is invalid.');
    }
  }

  private async runEvaluation(fen: string): Promise<void> {
    this.evaluating.set(true);
    this.evaluationError.set(null);
    this.engineWarning.set(null);
    const requestId = ++this.currentEvaluationRequest;
    const selectedConfig = this.engineConfig();

    try {
      const result = await this.analysisController.evaluatePosition(fen, selectedConfig);
      if (requestId !== this.currentEvaluationRequest) {
        return;
      }

      this.evaluation.set(result);
    } catch (error) {
      if (error instanceof StaleEvaluationError) {
        return;
      }

      const shouldFallback =
        selectedConfig.depth > 12 &&
        error instanceof Error &&
        /runtime|unreachable|timed out|failed/i.test(error.message);

      if (shouldFallback) {
        try {
          const fallbackConfig: EngineConfig = {
            ...selectedConfig,
            depth: 12
          };
          const fallbackResult = await this.analysisController.evaluatePosition(fen, fallbackConfig);
          if (requestId !== this.currentEvaluationRequest) {
            return;
          }

          this.engineWarning.set(
            `Engine became unstable at depth ${selectedConfig.depth} for this position. Showing fallback evaluation at depth 12.`
          );
          this.evaluation.set(fallbackResult);
          return;
        } catch {
        }
      }

      if (requestId !== this.currentEvaluationRequest) {
        return;
      }

      this.evaluationError.set(error instanceof Error ? error.message : 'Unable to evaluate this position.');
    } finally {
      if (requestId === this.currentEvaluationRequest) {
        this.evaluating.set(false);
      }
    }
  }

  private async syncBoardPosition(fen: string): Promise<void> {
    if (!this.chessboard) {
      return;
    }

    await this.chessboard.setPosition(fen, true);
  }
}
