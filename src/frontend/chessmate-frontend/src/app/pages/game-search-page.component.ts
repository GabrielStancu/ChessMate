import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AnalysisMode, EngineConfig } from '../models/analysis.models';
import { ErrorResponseEnvelope, GetGamesItemEnvelope } from '../models/games.models';
import { AnalysisLoadingDialogComponent, AnalysisLoadingDialogData } from './analysis-loading-dialog.component';
import { AnalysisCacheApiService } from '../services/analysis-cache-api.service';
import { AnalysisSessionService } from '../services/analysis-session.service';
import { FullGameAnalysisService } from '../services/full-game-analysis.service';
import { GamesApiService } from '../services/games-api.service';
import { StockfishAnalysisControllerService } from '../services/stockfish-analysis-controller.service';

const DRAW_RESULTS = new Set([
  'stalemate', 'insufficient', '50move', 'repetition', 'agreed', 'timevsinsufficient'
]);

const LAST_SEARCHED_USERNAME_STORAGE_KEY = 'lastSearchedUsername';
const LAST_ANALYSIS_MODE_STORAGE_KEY = 'lastAnalysisMode';

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
export class GameSearchPageComponent implements OnInit, AfterViewInit {
  @ViewChild('gamesSection') private gamesSection?: ElementRef<HTMLElement>;

  private readonly gamesApiService = inject(GamesApiService);
  private readonly analysisCacheApiService = inject(AnalysisCacheApiService);
  private readonly analysisSessionService = inject(AnalysisSessionService);
  private readonly fullGameAnalysisService = inject(FullGameAnalysisService);
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
  protected readonly hardRefreshLoading = signal(false);
  protected readonly hardRefreshStatusMessage = signal<string | null>(null);
  protected readonly hardRefreshStatusKind = signal<'error' | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string[]> | null>(null);
  protected readonly searched = signal(false);
  protected readonly analyzedGameIds = signal<Set<string>>(new Set());
  protected readonly canGoPrevious = computed(() => this.page() > 1 && !this.loading());
  protected readonly canGoNext = computed(() => this.hasMore() && !this.loading());

  public ngOnInit(): void {
    this.restoreStoredPreferences();
  }

  ngAfterViewInit(): void { /* noop – required for ViewChild resolution */ }

  protected async search(): Promise<void> {
    if (this.usernameControl.invalid) {
      this.usernameControl.markAsTouched();
      this.errorMessage.set('Enter a valid Chess.com username before searching.');
      this.fieldErrors.set(null);
      return;
    }

    this.persistLastSearchedUsername(this.usernameControl.value.trim());
    this.hardRefreshStatusMessage.set(null);
    this.hardRefreshStatusKind.set(null);
    await this.loadPage(1, false);
  }

  protected async hardRefresh(): Promise<void> {
    if (this.loading() || this.hardRefreshLoading()) {
      return;
    }

    if (this.usernameControl.invalid) {
      this.usernameControl.markAsTouched();
      this.hardRefreshStatusMessage.set('Enter a valid username before hard refresh.');
      this.hardRefreshStatusKind.set('error');
      return;
    }

    this.persistLastSearchedUsername(this.usernameControl.value.trim());
    this.hardRefreshStatusMessage.set(null);
    this.hardRefreshStatusKind.set(null);
    this.hardRefreshLoading.set(true);
    await this.loadPage(1, true);
  }

  protected async nextPage(): Promise<void> {
    if (!this.canGoNext()) {
      return;
    }

    await this.loadPage(this.page() + 1, false);
  }

  protected async previousPage(): Promise<void> {
    if (!this.canGoPrevious()) {
      return;
    }

    await this.loadPage(this.page() - 1, false);
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

  protected flagImageUrl(countryCode: string | null | undefined): string | null {
    if (!countryCode || countryCode.length !== 2) return null;
    return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
  }

  protected onFlagError(event: Event): void {
    (event.target as HTMLElement).style.display = 'none';
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
    this.persistLastAnalysisMode(mode);
    if (this.games().length > 0) {
      void this.refreshAnalyzedStatus();
    }
  }

  protected isAnalyzed(gameId: string): boolean {
    return this.analyzedGameIds().has(gameId);
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

  protected formatGameDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  protected formatTimeControl(tc: string): string {
    if (!tc) return tc;

    const match = tc.match(/^(\d+)(\+\d+)?(.*)$/);
    if (!match) return tc;

    const seconds = parseInt(match[1], 10);
    const increment = match[2] ?? '';
    const rest = match[3] ?? '';
    const displayTime = seconds < 60 ? seconds : Math.round(seconds / 60);

    const label = this.timeControlLabel(seconds);
    return `${label} | ${displayTime}${increment}${rest}`;
  }

  private timeControlLabel(seconds: number): string {
    if (seconds < 180) return 'Bullet';
    if (seconds < 600) return 'Blitz';
    if (seconds < 1800) return 'Rapid';
    return 'Classical';
  }

  private async runFullAnalysisAndNavigate(game: GetGamesItemEnvelope): Promise<void> {
    const mode = this.analysisMode();
    const config: EngineConfig = this.stockfishController.getPreset(mode);
    const username = this.usernameControl.value.trim();

    // Check backend cache first
    const cached = await this.analysisCacheApiService.getCache(game.gameId, mode, config.depth);
    if (cached) {
      this.analyzedGameIds.update(ids => new Set([...ids, game.gameId]));
      this.analysisSessionService.setFullGameAnalysis(cached);
      this.analyzingGameId.set(null);
      void this.router.navigate(['/analysis', game.gameId]);
      return;
    }

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
      this.analyzedGameIds.update(ids => new Set([...ids, game.gameId]));

      // Store in backend cache (best-effort, don't block navigation)
      this.analysisCacheApiService.putCache(game.gameId, mode, config.depth, result);

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

  private async refreshAnalyzedStatus(): Promise<void> {
    const mode = this.analysisMode();
    const config: EngineConfig = this.stockfishController.getPreset(mode);
    const games = this.games();
    const ids = await Promise.all(
      games.map(async game => {
        const cached = await this.analysisCacheApiService.getCache(game.gameId, mode, config.depth);
        return cached ? game.gameId : null;
      })
    );
    this.analyzedGameIds.set(new Set(ids.filter((id): id is string => id !== null)));
  }

  private scrollToGames(): void {
    requestAnimationFrame(() => {
      this.gamesSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private async loadPage(page: number, forceRefresh: boolean): Promise<void> {
    const username = this.usernameControl.value.trim();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set(null);
    this.searched.set(true);

    try {
      const response = await firstValueFrom(this.gamesApiService.getGames(username, page, forceRefresh));
      this.games.set(response.items);
      this.scrollToGames();
      this.page.set(response.page);
      this.hasMore.set(response.hasMore);
      this.sourceTimestamp.set(response.sourceTimestamp);
      this.cacheStatus.set(response.cacheStatus);
      void this.refreshAnalyzedStatus();
    } catch (error) {
      this.games.set([]);
      this.hasMore.set(false);
      this.readError(error);

      if (forceRefresh) {
        this.hardRefreshStatusMessage.set('Hard refresh failed. Please try again.');
        this.hardRefreshStatusKind.set('error');
      }
    } finally {
      this.loading.set(false);

      if (forceRefresh) {
        this.hardRefreshLoading.set(false);
      }
    }
  }

  private restoreStoredPreferences(): void {
    const storedMode = this.readFromLocalStorage(LAST_ANALYSIS_MODE_STORAGE_KEY);
    if (storedMode === 'quick' || storedMode === 'deep') {
      this.analysisMode.set(storedMode);
    }

    const storedUsername = this.readFromLocalStorage(LAST_SEARCHED_USERNAME_STORAGE_KEY);
    if (!storedUsername) {
      return;
    }

    this.usernameControl.setValue(storedUsername);

    if (!this.usernameControl.invalid) {
      void this.loadPage(1, false);
    }
  }

  private persistLastSearchedUsername(username: string): void {
    this.writeToLocalStorage(LAST_SEARCHED_USERNAME_STORAGE_KEY, username);
  }

  private persistLastAnalysisMode(mode: AnalysisMode): void {
    this.writeToLocalStorage(LAST_ANALYSIS_MODE_STORAGE_KEY, mode);
  }

  private readFromLocalStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeToLocalStorage(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore storage errors in non-browser/private contexts
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

}
