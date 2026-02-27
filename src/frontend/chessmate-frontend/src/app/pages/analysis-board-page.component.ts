import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { ArrowType, BORDER_TYPE, Chessboard, COLOR, FEN, MarkerType } from 'cm-chessboard/src/Chessboard.js';
import { Markers } from 'cm-chessboard/src/extensions/markers/Markers.js';
import { Arrows } from 'cm-chessboard/src/extensions/arrows/Arrows.js';
import {
  BatchCoachCoachingItemEnvelope,
  BatchCoachResponseEnvelope,
  buildCoachingLookup
} from '../models/batch-coach.models';
import {
  ClassifiedMove,
  FullGameAnalysisResult,
  CLASSIFICATION_COLORS,
  CLASSIFICATION_SYMBOLS,
  OVERLAY_ELIGIBLE_CLASSES
} from '../models/classification.models';
import { GetGamesItemEnvelope } from '../models/games.models';
import { CoachPanelComponent } from '../components/coach-panel.component';
import { EvaluationBarComponent } from '../components/evaluation-bar.component';
import { EvaluationChartComponent } from '../components/evaluation-chart.component';
import { MoveListComponent } from '../components/move-list.component';
import { AnalysisSessionService } from '../services/analysis-session.service';
import { buildEvaluationTimeline } from '../utils/evaluation.utils';

interface MoveStep {
  moveNumber: number;
  san: string;
}

@Component({
  selector: 'app-analysis-board-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, CoachPanelComponent, EvaluationBarComponent, EvaluationChartComponent, MoveListComponent],
  templateUrl: './analysis-board-page.component.html',
  styleUrl: './analysis-board-page.component.css'
})
export class AnalysisBoardPageComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly analysisSessionService = inject(AnalysisSessionService);

  @ViewChild('boardHost')
  private boardHost?: ElementRef<HTMLDivElement>;

  private chessboard: Chessboard | null = null;
  private readonly gameId = this.route.snapshot.paramMap.get('gameId') ?? '';

  protected readonly game = signal<GetGamesItemEnvelope | null>(this.resolveGame());
  protected readonly fullAnalysis = signal<FullGameAnalysisResult | null>(this.resolveFullAnalysis());
  protected readonly moveSteps = signal<MoveStep[]>([]);
  protected readonly positionTimeline = signal<string[]>([FEN.start]);
  protected readonly selectedPositionIndex = signal(0);
  protected readonly timelineWarning = signal<string | null>(null);

  protected readonly currentFen = computed(
    () => this.positionTimeline()[Math.min(this.selectedPositionIndex(), this.positionTimeline().length - 1)]
  );
  protected readonly previousFen = computed(() => {
    const index = this.selectedPositionIndex();
    if (index === 0) {
      return this.positionTimeline()[0];
    }
    return this.positionTimeline()[index - 1];
  });
  protected readonly canGoPrevious = computed(() => this.selectedPositionIndex() > 0);
  protected readonly canGoNext = computed(() => this.selectedPositionIndex() < this.positionTimeline().length - 1);

  protected readonly currentClassifiedMove = computed<ClassifiedMove | null>(() => {
    const index = this.selectedPositionIndex();
    const analysis = this.fullAnalysis();
    if (index === 0 || !analysis) {
      return null;
    }
    return analysis.classifiedMoves[index - 1] ?? null;
  });

  protected readonly classificationColors = CLASSIFICATION_COLORS;
  protected readonly classificationSymbols = CLASSIFICATION_SYMBOLS;

  protected readonly batchCoachResponse = signal<BatchCoachResponseEnvelope | null>(this.resolveBatchCoachResponse());
  protected readonly coachingLookup = computed(() => {
    const response = this.batchCoachResponse();
    const lookup = buildCoachingLookup(response);
    if (response) {
      console.info(`[ChessMate] Coaching data loaded: ${lookup.size} items for operationId ${response.operationId}`);
    }
    return lookup;
  });
  protected readonly selectedPly = computed(() => this.selectedPositionIndex());

  protected readonly evaluationTimeline = computed(() => {
    const analysis = this.fullAnalysis();
    if (!analysis) {
      return [0];
    }

    return buildEvaluationTimeline(analysis.classifiedMoves);
  });

  protected readonly currentEvaluation = computed(() => {
    const timeline = this.evaluationTimeline();
    const index = this.selectedPositionIndex();
    return timeline[Math.min(index, timeline.length - 1)] ?? 0;
  });

  protected readonly playerColor = computed(() => this.fullAnalysis()?.playerColor ?? 'white');

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
      const classifiedMove = this.currentClassifiedMove();
      void this.syncBoardAndOverlays(fen, classifiedMove);
    });
  }

  public ngAfterViewInit(): void {
    if (!this.boardHost) {
      return;
    }

    this.chessboard = new Chessboard(this.boardHost.nativeElement, {
      position: this.currentFen(),
      assetsUrl: 'assets/cm-chessboard/',
      orientation: this.fullAnalysis()?.playerColor === 'black' ? COLOR.black : COLOR.white,
      style: {
        borderType: BORDER_TYPE.frame,
        showCoordinates: true
      },
      extensions: [
        { class: Markers },
        { class: Arrows }
      ]
    });
  }

  public ngOnDestroy(): void {
    this.chessboard?.destroy();
    this.chessboard = null;
  }

  protected onPlySelected(ply: number): void {
    if (ply < 0 || ply >= this.positionTimeline().length) {
      return;
    }

    this.selectedPositionIndex.set(ply);
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

  private resolveFullAnalysis(): FullGameAnalysisResult | null {
    if (!this.gameId) {
      return null;
    }

    return this.analysisSessionService.getFullGameAnalysis(this.gameId);
  }

  private resolveBatchCoachResponse(): BatchCoachResponseEnvelope | null {
    if (!this.gameId) {
      return null;
    }

    return this.analysisSessionService.getBatchCoachResponse(this.gameId);
  }

  private async syncBoardAndOverlays(fen: string, classifiedMove: ClassifiedMove | null): Promise<void> {
    if (!this.chessboard) {
      return;
    }

    await this.chessboard.setPosition(fen, true);
    this.clearOverlays();

    if (!classifiedMove) {
      return;
    }

    const isEligible = (OVERLAY_ELIGIBLE_CLASSES as ReadonlyArray<string>).includes(classifiedMove.classification);
    if (!isEligible) {
      return;
    }

    const classKey = classifiedMove.classification.toLowerCase();

    const dimMarker: MarkerType = { class: 'marker-dim-highlight', slice: 'markerSquare' };
    this.chessboard.addMarker(dimMarker, classifiedMove.from);
    this.chessboard.addMarker(dimMarker, classifiedMove.to);

    const classificationMarker: MarkerType = {
      class: `marker-classification-${classKey}`,
      slice: 'markerCircle'
    };
    this.chessboard.addMarker(classificationMarker, classifiedMove.to);

    if (classifiedMove.bestMove) {
      const parsed = this.parseUciMove(classifiedMove.bestMove);
      if (parsed) {
        const arrowType: ArrowType = { class: `arrow-bestmove-${classKey}` };
        this.chessboard.addArrow(arrowType, parsed.from, parsed.to);
      }
    }
  }

  private clearOverlays(): void {
    if (!this.chessboard) {
      return;
    }

    this.chessboard.removeMarkers();
    this.chessboard.removeArrows();
  }

  private parseUciMove(uci: string): { from: string; to: string } | null {
    const normalized = uci.trim().toLowerCase();
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(normalized)) {
      return null;
    }

    return {
      from: normalized.slice(0, 2),
      to: normalized.slice(2, 4)
    };
  }
}
