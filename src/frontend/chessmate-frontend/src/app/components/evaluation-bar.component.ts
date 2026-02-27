import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { evalToBarPercent, formatEvalDisplay } from '../utils/evaluation.utils';

@Component({
  selector: 'app-evaluation-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="eval-bar-container" [attr.aria-label]="'Evaluation: ' + displayScore()">
      <div class="eval-bar-track"
           [class.track-flipped]="!topPlayerIsBlack()">
        <div
          class="eval-bar-fill"
          [class.fill-dark]="topPlayerIsBlack()"
          [class.fill-light]="!topPlayerIsBlack()"
          [style.height.%]="topFillPercent()">
        </div>
        <div class="eval-bar-label"
             [class.label-light]="topPlayerIsBlack()"
             [class.label-dark]="!topPlayerIsBlack()">
          {{ displayScore() }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .eval-bar-container {
      width: 28px;
      flex-shrink: 0;
      display: flex;
      align-items: stretch;
    }

    .eval-bar-track {
      position: relative;
      width: 100%;
      border: 3px solid #1f1f1f;
      border-radius: 0.5rem;
      overflow: hidden;
      background: #f0f0f0;
      min-height: 200px;
    }

    .eval-bar-track.track-flipped {
      background: #2c2c2c;
    }

    .eval-bar-fill {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      transition: height 0.3s ease;
    }

    .eval-bar-fill.fill-dark {
      background: #2c2c2c;
    }

    .eval-bar-fill.fill-light {
      background: #f0f0f0;
    }

    .eval-bar-label {
      position: absolute;
      left: 50%;
      top: 6px;
      transform: translateX(-50%);
      font-size: 0.6rem;
      font-weight: 700;
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
    }

    .eval-bar-label.label-light {
      color: #f0f0f0;
    }

    .eval-bar-label.label-dark {
      color: #2c2c2c;
    }
  `]
})
export class EvaluationBarComponent {
  /** White-relative centipawn score (clamped). */
  public readonly score = input.required<number>();

  /** Player perspective (controls bar orientation hint, but bar always shows White=bottom). */
  public readonly playerColor = input<'white' | 'black'>('white');

  protected readonly displayScore = computed(() => formatEvalDisplay(this.score()));

  /**
   * Percentage filled from the top of the bar.
   * Default (black at top): top fill = black portion = 100 - whitePercent.
   * Flipped (white at top): top fill = white portion = whitePercent.
   */
  protected readonly topFillPercent = computed(() => {
    const whitePercent = evalToBarPercent(this.score());
    return this.topPlayerIsBlack() ? 100 - whitePercent : whitePercent;
  });

  /** True when the top of the board shows the black player (default orientation). */
  protected readonly topPlayerIsBlack = computed(() => this.playerColor() === 'white');
}
