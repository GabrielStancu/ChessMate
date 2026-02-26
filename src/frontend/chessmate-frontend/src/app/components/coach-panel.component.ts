import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import {
  BatchCoachCoachingItemEnvelope,
  BatchCoachResponseEnvelope
} from '../models/batch-coach.models';
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
  imports: [CommonModule, MatCardModule, CoachAvatarComponent],
  template: `
    <mat-card class="coach-card">
      <mat-card-header class="coach-header">
        <app-coach-avatar />
        <mat-card-title>AI Coach</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <ng-container *ngIf="currentMove() as move; else noMoveState">
          <div class="coach-bubble" *ngIf="isCoachingLoaded(); else coachingUnavailable">
            <div
              class="coach-classification-pill"
              [style.background-color]="getClassificationColor(move.classification)">
              <span class="pill-symbol">{{ getClassificationSymbol(move.classification) }}</span>
              <span class="pill-label">{{ move.classification }}</span>
            </div>

            <p class="coach-explanation">{{ coachText() }}</p>
          </div>

          <ng-template #coachingUnavailable>
            <div
              class="coach-classification-pill"
              [style.background-color]="getClassificationColor(move.classification)">
              <span class="pill-symbol">{{ getClassificationSymbol(move.classification) }}</span>
              <span class="pill-label">{{ move.classification }}</span>
            </div>
            <p class="coach-unavailable">Coaching data was not loaded. Re-run analysis to generate coaching insights.</p>
          </ng-template>
        </ng-container>

        <ng-template #noMoveState>
          <p class="coach-empty">Navigate to a move to see coaching insights.</p>
        </ng-template>

        <div class="coach-footer" *ngIf="operationId()">
          <span class="operation-id">Operation: {{ operationId() }}</span>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .coach-card {
      border: 4px solid #1f1f1f;
      border-radius: 1.25rem;
      box-shadow: none;
    }

    .coach-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-bottom: 0.25rem;
    }

    .coach-bubble {
      border: 3px solid #1f1f1f;
      border-radius: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: #f0f4ff;
    }

    .coach-classification-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      border-radius: 2rem;
      border: 3px solid #1f1f1f;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }

    .pill-symbol {
      font-size: 0.95rem;
    }

    .pill-label {
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .coach-explanation {
      margin: 0;
      line-height: 1.4;
      font-size: 0.9rem;
      white-space: pre-line;
    }

    .coach-empty {
      color: #666;
      font-style: italic;
      margin: 0;
    }

    .coach-unavailable {
      color: #8a1222;
      font-weight: 600;
      font-size: 0.85rem;
      margin: 0.5rem 0 0;
    }

    .coach-footer {
      margin-top: 0.5rem;
      padding-top: 0.35rem;
      border-top: 2px solid #e0e0e0;
    }

    .operation-id {
      font-size: 0.75rem;
      color: #999;
      font-family: monospace;
      word-break: break-all;
    }
  `]
})
export class CoachPanelComponent {
  /** Currently selected classified move (null when at initial position). */
  public readonly currentMove = input<ClassifiedMove | null>(null);

  /** Coaching lookup map: ply → coaching item. */
  public readonly coachingLookup = input<Map<number, BatchCoachCoachingItemEnvelope>>(new Map());

  /** Full batch-coach response for operation correlation. */
  public readonly batchCoachResponse = input<BatchCoachResponseEnvelope | null>(null);

  protected readonly coachText = computed(() => {
    const move = this.currentMove();
    if (!move) {
      return '';
    }

    const lookup = this.coachingLookup();
    const coachingItem = lookup.get(move.ply);

    if (coachingItem && coachingItem.explanation) {
      return coachingItem.explanation;
    }

    return `${move.san} was ${move.classification}.`;
  });

  protected readonly isCoachingLoaded = computed(() => {
    return this.batchCoachResponse() !== null;
  });

  protected readonly operationId = computed(() => {
    const response = this.batchCoachResponse();
    return response?.operationId ?? null;
  });

  protected getClassificationColor(classification: MoveClassification | string): string {
    return CLASSIFICATION_COLORS[classification as MoveClassification] ?? '#78909C';
  }

  protected getClassificationSymbol(classification: MoveClassification | string): string {
    return CLASSIFICATION_SYMBOLS[classification as MoveClassification] ?? '';
  }
}
