import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  ClassifiedMove,
  CoachLine,
  CoachLineStep,
  CLASSIFICATION_COLORS,
  CLASSIFICATION_SYMBOLS,
  MoveClassification
} from '../models/classification.models';
import { CoachAvatarComponent } from './coach-avatar.component';

@Component({
  selector: 'app-coach-panel',
  standalone: true,
  imports: [CommonModule, CoachAvatarComponent],
  template: `
    <div class="coach-root">
      <!-- Header -->
      <div class="coach-header">
        <app-coach-avatar />
        <div class="coach-identity">
          <span class="coach-name">José Capawnblanca</span>
          <ng-container *ngIf="currentMove() as move">
            <div
              class="coach-classification-pill"
              [style.background-color]="getClassificationColor(move.classification)">
              <span class="pill-symbol">{{ getClassificationSymbol(move.classification) }}</span>
              <span class="pill-label">{{ move.classification }}</span>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Speech bubble body -->
      <div class="coach-bubble-wrapper">
        <div class="coach-bubble-tail"></div>
        <div class="coach-body">
          <ng-container *ngIf="isLineMode(); else normalMode">
            <!-- Line mode display -->
            <div class="coach-line-mode">
              <p class="coach-line-moves">{{ lineMovesDisplay() }}</p>
              <p class="coach-line-motif">{{ lineMotifDescription() }}</p>

              <!-- Line navigation -->
              <div class="coach-line-nav">
                <button class="line-nav-btn" (click)="lineFirst.emit()" [disabled]="!canLinePrev()" aria-label="Line start">⏮</button>
                <button class="line-nav-btn" (click)="linePrev.emit()" [disabled]="!canLinePrev()" aria-label="Previous line move">◀</button>
                <span class="line-nav-position">{{ lineStepIndex() }} / {{ lineSteps().length }}</span>
                <button class="line-nav-btn" (click)="lineNext.emit()" [disabled]="!canLineNext()" aria-label="Next line move">▶</button>
                <button class="line-nav-btn" (click)="lineLast.emit()" [disabled]="!canLineNext()" aria-label="Line end">⏭</button>
              </div>

              <button class="coach-line-cancel-btn" (click)="cancelLine.emit()">Cancel line</button>
            </div>
          </ng-container>

          <ng-template #normalMode>
            <ng-container *ngIf="currentMove() as move; else noMoveState">
              <p class="coach-explanation">{{ coachText() }}</p>
              <button
                *ngIf="hasCoachLine()"
                class="coach-line-show-btn"
                (click)="showLine.emit()">
                Show line
              </button>
            </ng-container>

            <ng-template #noMoveState>
              <p class="coach-empty">Navigate to a move to see coaching insights.</p>
            </ng-template>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .coach-root {
      border-bottom: 1px solid var(--cm-border);
      padding: 0.65rem 0.8rem;
      background: var(--cm-bg-card);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      flex-shrink: 0;
    }

    .coach-header {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    app-coach-avatar {
      width: 72px;
      height: 72px;
      flex-shrink: 0;
    }

    .coach-identity {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      min-width: 0;
      align-items: flex-start;
      justify-content: center;
    }

    .coach-name {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--cm-text-primary);
      line-height: 1.2;
      white-space: nowrap;
    }

    .coach-classification-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.65rem;
      border-radius: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.8rem;
      align-self: flex-start;
    }

    .pill-symbol {
      font-size: 0.9rem;
    }

    .pill-label {
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Speech bubble */
    .coach-bubble-wrapper {
      position: relative;
    }

    .coach-bubble-tail {
      position: absolute;
      top: -8px;
      left: 20px;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid #3a3a3a;
    }

    .coach-bubble-tail::after {
      content: '';
      position: absolute;
      top: 2px;
      left: -7px;
      width: 0;
      height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-bottom: 7px solid #1e1e1e;
    }

    .coach-body {
      min-height: 125px;
      overflow-x: hidden;
      background: #1e1e1e;
      border: 1px solid #3a3a3a;
      border-radius: var(--cm-radius-md);
      padding: 0.5rem 0.65rem;
    }

    .coach-explanation {
      margin: 0;
      line-height: 1.6;
      font-size: 0.82rem;
      white-space: pre-line;
      color: #ffffff;
    }

    .coach-sections {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .coach-section {
      margin: 0;
      line-height: 1.5;
      font-size: 0.82rem;
    }

    .section-label {
      color: var(--cm-accent);
      font-weight: 700;
    }

    .section-text {
      color: #ffffff;
    }

    .coach-empty {
      color: var(--cm-text-muted);
      font-style: italic;
      margin: 0;
      font-size: 0.82rem;
    }

    .coach-unavailable {
      color: #ff6b6b;
      font-weight: 600;
      font-size: 0.82rem;
      margin: 0;
    }

    /* Show line button */
    .coach-line-show-btn {
      display: inline-block;
      margin-top: 0.4rem;
      padding: 0.2rem 0.65rem;
      border-radius: 2rem;
      border: 1px solid var(--cm-accent, #4fc3f7);
      background: transparent;
      color: var(--cm-accent, #4fc3f7);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .coach-line-show-btn:hover {
      background: var(--cm-accent, #4fc3f7);
      color: #000;
    }

    /* Line mode display */
    .coach-line-mode {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .coach-line-header {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--cm-accent, #4fc3f7);
    }

    .coach-line-moves {
      margin: 0;
      font-size: 0.82rem;
      font-family: monospace;
      color: #ffffff;
      line-height: 1.5;
      word-break: break-word;
    }

    .coach-line-motif {
      margin: 0;
      font-size: 0.75rem;
      color: #f5c518;
      font-weight: 600;
    }

    /* Line navigation */
    .coach-line-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      margin-top: 0.15rem;
    }

    .line-nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1px solid var(--cm-border-strong, rgba(255,255,255,0.14));
      background: #000;
      color: var(--cm-text-secondary, #aaa);
      cursor: pointer;
      font-size: 0.7rem;
      padding: 0;
      transition: border-color 0.15s, color 0.15s;
    }

    .line-nav-btn:hover:not(:disabled) {
      border-color: var(--cm-accent, #4fc3f7);
      color: var(--cm-accent, #4fc3f7);
    }

    .line-nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .line-nav-position {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--cm-text-primary, #fff);
      font-variant-numeric: tabular-nums;
      min-width: 3rem;
      text-align: center;
    }

    /* Cancel line button */
    .coach-line-cancel-btn {
      display: inline-block;
      margin-top: 0.15rem;
      padding: 0.15rem 0.55rem;
      border-radius: 2rem;
      border: 1px solid #ef5350;
      background: transparent;
      color: #ef5350;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      align-self: center;
      transition: background 0.15s, color 0.15s;
    }

    .coach-line-cancel-btn:hover {
      background: #ef5350;
      color: #fff;
    }
  `]
})
export class CoachPanelComponent {
  /** Currently selected classified move (null when at initial position). */
  public readonly currentMove = input<ClassifiedMove | null>(null);

  /** Human-readable coaching explanation for the current move. */
  public readonly explanation = input<string>('');

  /** Whether we're currently navigating a coach line. */
  public readonly isLineMode = input(false);

  /** The line steps being navigated. */
  public readonly lineSteps = input<CoachLineStep[]>([]);

  /** Current step index within the line (0 = base position before first step). */
  public readonly lineStepIndex = input(0);

  /** Motif description for the active line. */
  public readonly lineMotifDescription = input('');

  /** Whether the user can navigate backwards in the line. */
  public readonly canLinePrev = input(false);

  /** Whether the user can navigate forwards in the line. */
  public readonly canLineNext = input(false);

  /** Emitted when the user clicks "Show line". */
  public readonly showLine = output<void>();

  /** Emitted when the user clicks "Cancel line". */
  public readonly cancelLine = output<void>();

  /** Line move navigation events. */
  public readonly lineFirst = output<void>();
  public readonly linePrev = output<void>();
  public readonly lineNext = output<void>();
  public readonly lineLast = output<void>();

  protected readonly coachText = computed(() => {
    const move = this.currentMove();
    if (!move) {
      return '';
    }
    const explanationText = this.explanation();
    if (explanationText) {
      return explanationText;
    }
    return `${move.san} was ${move.classification}.`;
  });

  protected hasCoachLine(): boolean {
    const move = this.currentMove();
    return !!move?.coachLine && move.coachLine.steps.length > 0;
  }

  protected readonly lineMovesDisplay = computed(() => {
    const steps = this.lineSteps();
    if (steps.length === 0) return '';
    const parts: string[] = [];
    for (let i = 0; i < steps.length; i++) {
      const moveNum = Math.floor(i / 2) + 1;
      if (i % 2 === 0) {
        parts.push(`${moveNum}. ${steps[i].san}`);
      } else {
        parts.push(steps[i].san);
      }
    }
    return parts.join(' ');
  });

  protected getClassificationColor(classification: MoveClassification | string): string {
    return CLASSIFICATION_COLORS[classification as MoveClassification] ?? '#78909C';
  }

  protected getClassificationSymbol(classification: MoveClassification | string): string {
    return CLASSIFICATION_SYMBOLS[classification as MoveClassification] ?? '';
  }
}
