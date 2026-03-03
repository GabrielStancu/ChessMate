import { Component, computed, input } from '@angular/core';
import { Chess } from 'chess.js';

const STARTING_COUNTS: Record<string, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 };
const PIECE_VALUES: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };
const DISPLAY_ORDER = ['q', 'r', 'b', 'n', 'p'] as const;

interface CapturedGroup {
  type: string;
  svgId: string;
  count: number;
}

@Component({
  selector: 'app-captured-pieces',
  standalone: true,
  template: `
    <div class="captured-strip" role="list" [attr.aria-label]="'Pieces captured by ' + capturedByColor()">
      @for (group of capturedGroups(); track group.type) {
        <div class="piece-group" role="listitem" [attr.aria-label]="group.count + ' ' + group.type">
          @for (i of range(group.count); track i) {
            <svg class="captured-piece" viewBox="0 0 40 40" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <use [attr.href]="'assets/cm-chessboard/pieces/standard.svg#' + group.svgId" />
            </svg>
          }
        </div>
      }
      @if (materialAdvantage() > 0) {
        <span class="material-adv" [attr.aria-label]="'Material advantage ' + materialAdvantage()">+{{ materialAdvantage() }}</span>
      }
    </div>
  `,
  styles: [`
    .captured-strip {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 1px;
      min-height: 22px;
    }

    .piece-group {
      display: flex;
      align-items: center;
      margin-right: 2px;
    }

    .captured-piece {
      width: 22px;
      height: 22px;
      display: block;
      margin-right: -6px;
      opacity: 0.9;
    }

    .piece-group:last-of-type .captured-piece:last-child {
      margin-right: 0;
    }

    .material-adv {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--cm-text-secondary, #aaa);
      margin-left: 10px;
    }
  `]
})
export class CapturedPiecesComponent {
  readonly fen = input<string>('');
  readonly capturedByColor = input<'white' | 'black'>('white');

  readonly capturedGroups = computed<CapturedGroup[]>(() => {
    const fen = this.fen();
    if (!fen) return [];

    const capturedBy = this.capturedByColor();
    // The pieces shown are the OPPONENT's pieces that were captured
    const opponentSvgPrefix = capturedBy === 'white' ? 'b' : 'w';
    const onBoard = parseBoardCounts(fen);

    return DISPLAY_ORDER
      .map(type => {
        const boardKey = `${opponentSvgPrefix}${type}`;
        const startCount = STARTING_COUNTS[type];
        const boardCount = onBoard[boardKey] ?? 0;
        const captured = Math.max(0, startCount - boardCount);
        return { type, svgId: `${opponentSvgPrefix}${type}`, count: captured };
      })
      .filter(g => g.count > 0);
  });

  readonly materialAdvantage = computed<number>(() => {
    const fen = this.fen();
    if (!fen) return 0;

    const capturedBy = this.capturedByColor();
    const myPrefix = capturedBy === 'white' ? 'w' : 'b';
    const oppPrefix = capturedBy === 'white' ? 'b' : 'w';
    const onBoard = parseBoardCounts(fen);

    const myCaptureValue = DISPLAY_ORDER.reduce((sum, type) => {
      const captured = Math.max(0, STARTING_COUNTS[type] - (onBoard[`${oppPrefix}${type}`] ?? 0));
      return sum + captured * PIECE_VALUES[type];
    }, 0);

    const theirCaptureValue = DISPLAY_ORDER.reduce((sum, type) => {
      const captured = Math.max(0, STARTING_COUNTS[type] - (onBoard[`${myPrefix}${type}`] ?? 0));
      return sum + captured * PIECE_VALUES[type];
    }, 0);

    return Math.max(0, myCaptureValue - theirCaptureValue);
  });

  protected range(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }
}

function parseBoardCounts(fen: string): Record<string, number> {
  const counts: Record<string, number> = {};
  try {
    const game = new Chess(fen);
    for (const row of game.board()) {
      for (const sq of row) {
        if (sq) {
          const key = `${sq.color}${sq.type}`;
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
    }
  } catch {
    // Invalid FEN — return empty counts
  }
  return counts;
}
