import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
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

@Component({
  selector: 'app-game-search-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './game-search-page.component.html',
  styleUrl: './game-search-page.component.css'
})
export class GameSearchPageComponent {
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
  protected readonly page = signal(1);
  protected readonly hasMore = signal(false);
  protected readonly sourceTimestamp = signal<string | null>(null);
  protected readonly cacheStatus = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string[]> | null>(null);
  protected readonly searched = signal(false);
  protected readonly canGoPrevious = computed(() => this.page() > 1 && !this.loading());
  protected readonly canGoNext = computed(() => this.hasMore() && !this.loading());
  protected readonly searchBackgroundImageUrl = environment.searchBackgroundImageUrl;

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

  private async runFullAnalysisAndNavigate(game: GetGamesItemEnvelope): Promise<void> {
    const mode = this.analysisMode();
    const config: EngineConfig = this.stockfishController.getPreset(mode);
    const username = this.usernameControl.value.trim();

    const dialogRef = this.dialog.open(AnalysisLoadingDialogComponent, {
      disableClose: true,
      width: '440px',
      data: {
        gameName: game.opening || 'Unknown opening',
        opponent: game.opponent,
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

  private async loadPage(page: number): Promise<void> {
    const username = this.usernameControl.value.trim();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set(null);
    this.searched.set(true);

    try {
      const response = await firstValueFrom(this.gamesApiService.getGames(username, page));
      this.games.set(response.items);
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
