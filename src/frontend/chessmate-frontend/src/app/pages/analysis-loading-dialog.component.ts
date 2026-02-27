import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AnalysisProgress } from '../services/full-game-analysis.service';

export interface AnalysisLoadingDialogData {
  whitePlayer: string;
  blackPlayer: string;
  progress: () => AnalysisProgress;
}

@Component({
  selector: 'app-analysis-loading-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatProgressBarModule],
  template: `
    <div class="loading-dialog">
      <h2 class="loading-title">Analyzing Game</h2>
      <p class="loading-subtitle">{{ data.whitePlayer }} <span class="vs-sep">vs</span> {{ data.blackPlayer }}</p>

      <div class="progress-section">
        <mat-progress-bar
          [mode]="progressMode()"
          [value]="progressPercent()">
        </mat-progress-bar>
        <p class="progress-label">{{ progressLabel() }}</p>
      </div>

      <p class="loading-hint" *ngIf="data.progress().phase === 'evaluating'">
        Running Stockfish engine on each position...
      </p>
      <p class="loading-hint" *ngIf="data.progress().phase === 'classifying'">
        Classifying moves by win expectancy...
      </p>
      <p class="loading-hint" *ngIf="data.progress().phase === 'coaching'">
        Generating coaching insights...
      </p>
      <p class="loading-hint" *ngIf="data.progress().phase === 'loading'">
        Preparing game data...
      </p>

      <p class="error-message" *ngIf="data.progress().phase === 'error'">
        {{ data.progress().errorMessage || 'Analysis failed.' }}
      </p>
    </div>
  `,
  styles: [`
    .loading-dialog {
      padding: 1.5rem;
      text-align: center;
      min-width: 360px;
    }

    .loading-title {
      margin: 0 0 0.25rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--cm-text-primary);
    }

    .loading-subtitle {
      margin: 0 0 1.5rem;
      color: var(--cm-text-secondary);
      font-size: 0.95rem;
    }

    .vs-sep {
      color: var(--cm-text-muted);
      font-size: 0.8rem;
      margin: 0 0.25rem;
    }

    .progress-section {
      margin-bottom: 1rem;
    }

    .progress-label {
      margin: 0.5rem 0 0;
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--cm-text-primary);
    }

    .loading-hint {
      color: var(--cm-text-secondary);
      font-size: 0.85rem;
      margin: 0.5rem 0 0;
    }

    .error-message {
      color: var(--cm-loss);
      font-weight: 600;
      margin: 1rem 0 0;
    }

    ::ng-deep .loading-dialog .mat-mdc-progress-bar {
      border-radius: 8px;
      height: 10px;
    }

    ::ng-deep .loading-dialog .mat-mdc-progress-bar .mdc-linear-progress__bar-inner {
      border-color: var(--cm-accent);
    }

    ::ng-deep .loading-dialog .mat-mdc-progress-bar .mdc-linear-progress__buffer-bar {
      background: rgba(212, 168, 67, 0.15);
    }

    ::ng-deep .loading-dialog .mat-mdc-progress-bar .mdc-linear-progress__buffer-dots {
      background-image: none;
      background-color: rgba(212, 168, 67, 0.1);
    }
  `]
})
export class AnalysisLoadingDialogComponent {
  protected readonly dialogRef = inject(MatDialogRef<AnalysisLoadingDialogComponent>);
  protected readonly data = inject<AnalysisLoadingDialogData>(MAT_DIALOG_DATA);

  protected progressPercent(): number {
    const p = this.data.progress();
    if (p.total === 0) {
      return 0;
    }

    return Math.round((p.current / p.total) * 100);
  }

  protected progressMode(): 'determinate' | 'indeterminate' {
    const p = this.data.progress();
    if (p.phase === 'loading' || p.phase === 'coaching' || p.total === 0) {
      return 'indeterminate';
    }

    return 'determinate';
  }

  protected progressLabel(): string {
    const p = this.data.progress();

    if (p.phase === 'loading') {
      return 'Preparing...';
    }

    if (p.phase === 'coaching') {
      return 'Generating coaching...';
    }

    if (p.phase === 'done') {
      return 'Analysis complete!';
    }

    if (p.phase === 'error') {
      return 'Analysis failed';
    }

    return `${p.current} / ${p.total} positions`;
  }
}
