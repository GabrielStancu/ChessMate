import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  computed,
  input,
  output
} from '@angular/core';
import {
  BatchCoachCoachingItemEnvelope
} from '../models/batch-coach.models';
import {
  ClassifiedMove,
  CLASSIFICATION_COLORS,
  CLASSIFICATION_SYMBOLS,
  COACHING_ELIGIBLE_CLASSES,
  MoveClassification
} from '../models/classification.models';

@Component({
  selector: 'app-move-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="move-list-container" #scrollContainer>
      <div
        *ngFor="let move of moves(); let i = index"
        class="move-list-item"
        [class.selected]="selectedPly() === move.ply"
        [class.is-user-move]="move.isUserMove"
        [attr.data-ply]="move.ply"
        (click)="selectMove(move.ply)">
        <span class="move-number">{{ getMoveNumber(move.ply) }}.</span>
        <span
          class="move-dot"
          [style.background-color]="getColor(move.classification)">
        </span>
        <span class="move-san">{{ move.san }}</span>
        <span class="move-symbol">{{ getSymbol(move.classification) }}</span>
        <span class="coach-indicator" *ngIf="hasCoaching(move)">&#x1F4AC;</span>
      </div>

      <p class="empty-hint" *ngIf="moves().length === 0">
        No moves to display.
      </p>
    </div>
  `,
  styles: [`
    .move-list-container {
      border: 3px solid #1f1f1f;
      border-radius: 0.75rem;
      flex: 1 1 0;
      min-height: 80px;
      max-height: 200px;
      overflow-y: auto;
      padding: 0.25rem;
    }

    .move-list-item {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.4rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background-color 0.15s;
    }

    .move-list-item:hover {
      background-color: #e8eaf6;
    }

    .move-list-item.selected {
      background-color: #c5cae9;
      font-weight: 700;
    }

    .move-number {
      min-width: 2rem;
      color: #888;
      font-size: 0.8rem;
      text-align: right;
    }

    .move-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid #1f1f1f;
      flex-shrink: 0;
    }

    .move-san {
      flex: 1;
    }

    .move-symbol {
      font-size: 0.8rem;
      color: #555;
    }

    .coach-indicator {
      font-size: 0.75rem;
      flex-shrink: 0;
    }

    .empty-hint {
      color: #666;
      font-style: italic;
      text-align: center;
      padding: 1rem;
      margin: 0;
    }
  `]
})
export class MoveListComponent implements AfterViewChecked {
  /** All classified moves for the game. */
  public readonly moves = input<ClassifiedMove[]>([]);

  /** Currently selected ply (1-based). 0 = initial position. */
  public readonly selectedPly = input<number>(0);

  /** Coaching lookup for indicator display. */
  public readonly coachingLookup = input<Map<number, BatchCoachCoachingItemEnvelope>>(new Map());

  /** Emits when user clicks a move. */
  public readonly plySelected = output<number>();

  @ViewChild('scrollContainer')
  private scrollContainer?: ElementRef<HTMLDivElement>;

  private lastScrolledPly = -1;

  protected readonly isCoachingEligible = computed(() => {
    return new Set(COACHING_ELIGIBLE_CLASSES);
  });

  public ngAfterViewChecked(): void {
    const ply = this.selectedPly();
    if (ply === this.lastScrolledPly) {
      return;
    }

    this.lastScrolledPly = ply;
    this.scrollToSelectedMove(ply);
  }

  protected selectMove(ply: number): void {
    this.plySelected.emit(ply);
  }

  protected getMoveNumber(ply: number): string {
    return String(Math.ceil(ply / 2));
  }

  protected getColor(classification: MoveClassification | string): string {
    return CLASSIFICATION_COLORS[classification as MoveClassification] ?? '#78909C';
  }

  protected getSymbol(classification: MoveClassification | string): string {
    return CLASSIFICATION_SYMBOLS[classification as MoveClassification] ?? '';
  }

  protected hasCoaching(move: ClassifiedMove): boolean {
    const lookup = this.coachingLookup();
    return lookup.has(move.ply);
  }

  private scrollToSelectedMove(ply: number): void {
    if (!this.scrollContainer) {
      return;
    }

    const container = this.scrollContainer.nativeElement;
    const target = container.querySelector(`[data-ply="${ply}"]`) as HTMLElement | null;

    if (!target) {
      return;
    }

    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const targetTop = target.offsetTop;
    const targetBottom = targetTop + target.offsetHeight;

    if (targetTop < containerTop || targetBottom > containerBottom) {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}
