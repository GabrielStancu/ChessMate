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

interface MovePair {
  moveNumber: number;
  white: ClassifiedMove | null;
  black: ClassifiedMove | null;
}

@Component({
  selector: 'app-move-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="move-table" #scrollContainer>
      <!-- Header row -->
      <div class="move-row move-header">
        <span class="col-num">#</span>
        <span class="col-move">White</span>
        <span class="col-move">Black</span>
      </div>

      <!-- Move pairs -->
      <div
        *ngFor="let pair of movePairs()"
        class="move-row"
        [class.row-selected]="isRowSelected(pair)">

        <span class="col-num">{{ pair.moveNumber }}</span>

        <!-- White move -->
        <span
          class="col-move move-cell"
          [class.cell-selected]="pair.white !== null && selectedPly() === pair.white.ply"
          [class.cell-empty]="pair.white === null"
          (click)="pair.white && selectMove(pair.white.ply)">
          <ng-container *ngIf="pair.white as m">
            <span class="move-dot" [style.background-color]="getColor(m.classification)"></span>
            <span class="move-san">{{ m.san }}</span>
            <span class="move-symbol">{{ getSymbol(m.classification) }}</span>
          </ng-container>
        </span>

        <!-- Black move -->
        <span
          class="col-move move-cell"
          [class.cell-selected]="pair.black !== null && selectedPly() === pair.black.ply"
          [class.cell-empty]="pair.black === null"
          (click)="pair.black && selectMove(pair.black.ply)">
          <ng-container *ngIf="pair.black as m">
            <span class="move-dot" [style.background-color]="getColor(m.classification)"></span>
            <span class="move-san">{{ m.san }}</span>
            <span class="move-symbol">{{ getSymbol(m.classification) }}</span>
          </ng-container>
        </span>

      </div>

      <p class="empty-hint" *ngIf="moves().length === 0">No moves to display.</p>
    </div>
  `,
  styles: [`
    .move-table {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      height: 100%;
      background: var(--cm-bg-card);
    }

    .move-row {
      display: grid;
      grid-template-columns: 2.5rem 1fr 1fr;
      align-items: center;
      gap: 0;
      min-height: 52px;
    }

    .move-header {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--cm-bg-panel);
      border-bottom: 1px solid var(--cm-border);
      padding: 0.25rem 0;
    }

    .col-num {
      font-size: 1rem;
      color: var(--cm-text-muted);
      text-align: right;
      padding-right: 0.5rem;
      font-variant-numeric: tabular-nums;
    }

    .move-header .col-move {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--cm-text-primary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0 0.4rem;
      cursor: default;
    }

    .move-cell {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.5rem;
      cursor: pointer;
      font-size: 1.35rem;
      color: var(--cm-text-secondary);
      transition: background 0.12s;
      border-radius: var(--cm-radius-sm);
    }

    .move-cell:hover:not(.cell-empty) {
      background: var(--cm-bg-card-hover);
      color: var(--cm-text-primary);
    }

    .move-cell.cell-empty {
      cursor: default;
    }

    .cell-selected {
      background: var(--cm-accent-dim) !important;
      color: var(--cm-accent) !important;
      font-weight: 700;
    }

    .move-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.12);
      flex-shrink: 0;
    }

    .move-san {
      flex: 1;
      min-width: 0;
    }

    .move-symbol {
      font-size: 1.3rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .coach-indicator {
      font-size: 0.72rem;
      flex-shrink: 0;
    }

    .empty-hint {
      color: var(--cm-text-muted);
      font-style: italic;
      text-align: center;
      padding: 1.5rem 1rem;
      margin: 0;
    }
  `]
})
export class MoveListComponent implements AfterViewChecked {
  public readonly moves = input<ClassifiedMove[]>([]);
  public readonly selectedPly = input<number>(0);
  public readonly coachingLookup = input<Map<number, BatchCoachCoachingItemEnvelope>>(new Map());
  public readonly plySelected = output<number>();

  @ViewChild('scrollContainer')
  private scrollContainer?: ElementRef<HTMLDivElement>;

  private lastScrolledPly = -1;

  protected readonly movePairs = computed<MovePair[]>(() => {
    const all = this.moves();
    const pairMap = new Map<number, { white?: ClassifiedMove; black?: ClassifiedMove }>();

    for (const move of all) {
      const num = Math.ceil(move.ply / 2);
      if (!pairMap.has(num)) {
        pairMap.set(num, {});
      }
      const pair = pairMap.get(num)!;
      if (move.ply % 2 === 1) {
        pair.white = move;
      } else {
        pair.black = move;
      }
    }

    return Array.from(pairMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([moveNumber, pair]) => ({
        moveNumber,
        white: pair.white ?? null,
        black: pair.black ?? null
      }));
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

  protected isRowSelected(pair: MovePair): boolean {
    const ply = this.selectedPly();
    return (pair.white?.ply === ply) || (pair.black?.ply === ply);
  }

  protected getColor(classification: MoveClassification | string): string {
    return CLASSIFICATION_COLORS[classification as MoveClassification] ?? '#78909C';
  }

  protected getSymbol(classification: MoveClassification | string): string {
    return CLASSIFICATION_SYMBOLS[classification as MoveClassification] ?? '';
  }

  protected hasCoaching(move: ClassifiedMove): boolean {
    return this.coachingLookup().has(move.ply);
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
