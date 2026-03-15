import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import {
  ClassifiedMove,
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
          <ng-container *ngIf="currentMove() as move; else noMoveState">
            <p class="coach-explanation">{{ coachText() }}</p>
          </ng-container>

          <ng-template #noMoveState>
            <p class="coach-empty">Navigate to a move to see coaching insights.</p>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .coach-root {
      border-bottom: 1px solid var(--cm-border);
      padding: 0.85rem 1rem;
      background: var(--cm-bg-card);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .coach-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    app-coach-avatar {
      width: 88px;
      height: 88px;
      flex-shrink: 0;
    }

    .coach-identity {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 0;
      align-items: flex-start;
      justify-content: center;
    }

    .coach-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--cm-text-primary);
      line-height: 1.2;
      white-space: nowrap;
    }

    .coach-classification-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.85rem;
      border-radius: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      font-weight: 700;
      font-size: 1rem;
      align-self: flex-start;
    }

    .pill-symbol {
      font-size: 1.1rem;
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
      border-bottom: 8px solid var(--cm-border);
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
      border-bottom: 7px solid var(--cm-bg-panel);
    }

    .coach-body {
      height: 155px;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--cm-bg-panel);
      border: 1px solid var(--cm-border);
      border-radius: var(--cm-radius-md);
      padding: 0.65rem 0.85rem;
    }

    .coach-explanation {
      margin: 0;
      line-height: 1.6;
      font-size: 0.9rem;
      white-space: pre-line;
      color: #ffffff;
    }

    .coach-sections {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .coach-section {
      margin: 0;
      line-height: 1.5;
      font-size: 0.88rem;
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
      font-size: 0.9rem;
    }

    .coach-unavailable {
      color: #ff6b6b;
      font-weight: 600;
      font-size: 0.88rem;
      margin: 0;
    }
  `]
})
export class CoachPanelComponent {
  /** Currently selected classified move (null when at initial position). */
  public readonly currentMove = input<ClassifiedMove | null>(null);

  /** Human-readable coaching explanation for the current move. */
  public readonly explanation = input<string>('');

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

  protected getClassificationColor(classification: MoveClassification | string): string {
    return CLASSIFICATION_COLORS[classification as MoveClassification] ?? '#78909C';
  }

  protected getClassificationSymbol(classification: MoveClassification | string): string {
    return CLASSIFICATION_SYMBOLS[classification as MoveClassification] ?? '';
  }
}
