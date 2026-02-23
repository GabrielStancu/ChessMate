import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ErrorResponseEnvelope, GetGamesItemEnvelope } from '../models/games.models';
import { AnalysisSessionService } from '../services/analysis-session.service';
import { GamesApiService } from '../services/games-api.service';

@Component({
  selector: 'app-game-search-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './game-search-page.component.html',
  styleUrl: './game-search-page.component.css'
})
export class GameSearchPageComponent {
  private readonly gamesApiService = inject(GamesApiService);
  private readonly analysisSessionService = inject(AnalysisSessionService);
  private readonly router = inject(Router);

  protected readonly pageSize = 12;
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
    this.analysisSessionService.setSelectedGame(game);
    void this.router.navigate(['/analysis', game.gameId]);
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
}
