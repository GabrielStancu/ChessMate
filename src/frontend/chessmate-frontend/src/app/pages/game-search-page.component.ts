import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AnalysisMode, EngineConfig } from '../models/analysis.models';
import { ErrorResponseEnvelope, GetGamesItemEnvelope } from '../models/games.models';
import { AnalysisLoadingDialogComponent, AnalysisLoadingDialogData } from './analysis-loading-dialog.component';
import { buildBatchCoachPayload, generateIdempotencyKey } from '../models/batch-coach.models';
import { COACHING_ELIGIBLE_CLASSES } from '../models/classification.models';
import { AnalysisSessionService } from '../services/analysis-session.service';
import { BatchCoachApiService } from '../services/batch-coach-api.service';
import { FullGameAnalysisService } from '../services/full-game-analysis.service';
import { GamesApiService } from '../services/games-api.service';
import { StockfishAnalysisControllerService } from '../services/stockfish-analysis-controller.service';

const DRAW_RESULTS = new Set([
  'stalemate', 'insufficient', '50move', 'repetition', 'agreed', 'timevsinsufficient'
]);

@Component({
  selector: 'app-game-search-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule
  ],
  templateUrl: './game-search-page.component.html',
  styleUrl: './game-search-page.component.css'
})
export class GameSearchPageComponent implements AfterViewInit {
  @ViewChild('gamesSection') private gamesSection?: ElementRef<HTMLElement>;

  private readonly gamesApiService = inject(GamesApiService);
  private readonly analysisSessionService = inject(AnalysisSessionService);
  private readonly fullGameAnalysisService = inject(FullGameAnalysisService);
  private readonly batchCoachApiService = inject(BatchCoachApiService);
  private readonly stockfishController = inject(StockfishAnalysisControllerService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly pageSize = 12;
  protected readonly analysisMode = signal<AnalysisMode>('quick');
  protected readonly analyzingGameId = signal<string | null>(null);
  protected readonly usernameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]{3,25}$/)]
  });
  protected readonly loading = signal(false);
  protected readonly games = signal<GetGamesItemEnvelope[]>([]);
  protected readonly displayedGames = computed(() => this.games().slice(0, 9));
  protected readonly page = signal(1);
  protected readonly hasMore = signal(false);
  protected readonly sourceTimestamp = signal<string | null>(null);
  protected readonly cacheStatus = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string[]> | null>(null);
  protected readonly searched = signal(false);
  protected readonly canGoPrevious = computed(() => this.page() > 1 && !this.loading());
  protected readonly canGoNext = computed(() => this.hasMore() && !this.loading());

  ngAfterViewInit(): void { /* noop – required for ViewChild resolution */ }

  protected async search(): Promise<void> {
    if (this.usernameControl.invalid) {
      this.usernameControl.markAsTouched();
      this.errorMessage.set('Enter a valid Chess.com username before searching.');
      this.fieldErrors.set(null);
      return;
    }

    await this.loadPage(1);
  }

  protected async nextPage(): Promise<void> {
    if (!this.canGoNext()) {
      return;
    }

    await this.loadPage(this.page() + 1);
  }

  protected async previousPage(): Promise<void> {
    if (!this.canGoPrevious()) {
      return;
    }

    await this.loadPage(this.page() - 1);
  }

  protected getControlError(): string | null {
    if (!this.usernameControl.touched) {
      return null;
    }

    if (this.usernameControl.hasError('required')) {
      return 'Username is required.';
    }

    if (this.usernameControl.hasError('pattern')) {
      return 'Use 3-25 letters, numbers, underscore, or hyphen.';
    }

    return null;
  }

  protected trackByGameId(_: number, item: GetGamesItemEnvelope): string {
    return item.gameId;
  }

  protected openAnalysis(game: GetGamesItemEnvelope): void {
    if (this.analyzingGameId()) {
      return;
    }

    this.analyzingGameId.set(game.gameId);
    this.analysisSessionService.setSelectedGame(game);
    void this.runFullAnalysisAndNavigate(game);
  }

  protected setAnalysisMode(mode: AnalysisMode): void {
    this.analysisMode.set(mode);
  }

  protected getResultClass(game: GetGamesItemEnvelope): 'win' | 'loss' | 'draw' {
    const result = game.result?.toLowerCase() ?? '';
    if (result === 'win') {
      return 'win';
    }

    if (DRAW_RESULTS.has(result)) {
      return 'draw';
    }

    return 'loss';
  }

  protected formatResult(game: GetGamesItemEnvelope): string {
    const cls = this.getResultClass(game);
    const isWhite = game.playerColor === 'white';

    if (cls === 'draw') {
      return '½-½';
    }

    if (cls === 'win') {
      return isWhite ? '1-0' : '0-1';
    }

    return isWhite ? '0-1' : '1-0';
  }

  protected formatTimeControl(tc: string): string {
    if (!tc) {
      return tc;
    }

    const match = tc.match(/^(\d+)(\+\d+)?(.*)$/);

    if (!match) {
      return tc;
    }

    const seconds = parseInt(match[1], 10);
    const increment = match[2] ?? '';
    const rest = match[3] ?? '';
    const minutes = seconds < 60 ? seconds : Math.round(seconds / 60);

    return `${minutes}${increment}${rest}`;
  }

  private async runFullAnalysisAndNavigate(game: GetGamesItemEnvelope): Promise<void> {
    const mode = this.analysisMode();
    const config: EngineConfig = this.stockfishController.getPreset(mode);
    const username = this.usernameControl.value.trim();

    const dialogRef = this.dialog.open(AnalysisLoadingDialogComponent, {
      disableClose: true,
      width: '440px',
      data: {
        whitePlayer: game.whitePlayer,
        blackPlayer: game.blackPlayer,
        progress: () => this.fullGameAnalysisService.progress()
      } as AnalysisLoadingDialogData
    });

    try {
      const pgn = game.pgn ?? '';

      if (!pgn.trim()) {
        dialogRef.close();
        this.analyzingGameId.set(null);
        this.errorMessage.set('Cannot analyze: no PGN data available for this game.');
        return;
      }

      const result = await this.fullGameAnalysisService.analyzeGame(
        pgn,
        game.gameId,
        username,
        mode,
        config,
        game.initialFen
      );

      this.analysisSessionService.setFullGameAnalysis(result);

      // Submit coaching request for eligible moves (non-blocking on failure)
      await this.submitCoachingRequest(result, mode, config);

      dialogRef.close();
      this.analyzingGameId.set(null);
      void this.router.navigate(['/analysis', game.gameId]);
    } catch (error) {
      dialogRef.close();
      this.analyzingGameId.set(null);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Full-game analysis failed.'
      );
    }
  }

  private scrollToGames(): void {
    requestAnimationFrame(() => {
      this.gamesSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private async loadPage(page: number): Promise<void> {
    const username = this.usernameControl.value.trim();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set(null);
    this.searched.set(true);

    try {
      const response = await firstValueFrom(this.gamesApiService.getGames(username, page));
      this.games.set(response.items);
      this.scrollToGames();
      this.page.set(response.page);
      this.hasMore.set(response.hasMore);
      this.sourceTimestamp.set(response.sourceTimestamp);
      this.cacheStatus.set(response.cacheStatus);
    } catch (error) {
      this.games.set([]);
      this.hasMore.set(false);
      this.readError(error);
    } finally {
      this.loading.set(false);
    }
  }

  private readError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      const envelope = error.error as Partial<ErrorResponseEnvelope> | null;
      const message = envelope?.message ?? 'Unable to retrieve games right now.';
      this.errorMessage.set(message);

      if (envelope?.errors && typeof envelope.errors === 'object') {
        this.fieldErrors.set(envelope.errors);
      }
      return;
    }

    this.errorMessage.set('Unable to retrieve games right now.');
  }

  private async submitCoachingRequest(
    result: import('../models/classification.models').FullGameAnalysisResult,
    mode: AnalysisMode,
    config: EngineConfig
  ): Promise<void> {
    const payload = buildBatchCoachPayload(result);

    const hasEligibleMoves = result.classifiedMoves.some(
      (m) => (COACHING_ELIGIBLE_CLASSES as ReadonlyArray<string>).includes(m.classification)
    );

    if (!hasEligibleMoves) {
      return;
    }

    this.fullGameAnalysisService.progress.set({
      current: 0,
      total: 0,
      phase: 'coaching'
    });

    try {
      const idempotencyKey = generateIdempotencyKey(result.gameId, mode, config);
      const coachResponse = await this.batchCoachApiService.submitBatchCoach(payload, idempotencyKey);
      this.analysisSessionService.setBatchCoachResponse(coachResponse);
    } catch (error) {
      console.warn('[ChessMate] Coaching request failed (non-blocking):', error);
    }
  }
}
