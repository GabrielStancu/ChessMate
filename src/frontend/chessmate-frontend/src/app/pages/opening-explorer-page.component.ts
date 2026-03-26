import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chess, Square } from 'chess.js';
import { Chessboard, BORDER_TYPE, COLOR, FEN, ArrowType, MarkerType } from 'cm-chessboard/src/Chessboard.js';
import { Arrows } from 'cm-chessboard/src/extensions/arrows/Arrows.js';
import { Markers, MARKER_TYPE } from 'cm-chessboard/src/extensions/markers/Markers.js';
import { CoachAvatarComponent } from '../components/coach-avatar.component';
import { OPENINGS_CATALOG, SIDE_LABELS } from '../data/openings-catalog';
import { getOpeningMoveCoaching } from '../data/opening-coach-commentary';
import { LichessExplorerService } from '../services/lichess-explorer.service';
import {
  ExplorerContinuation,
  MoveHistoryEntry,
  OpeningDefinition,
  OpeningSide
} from '../models/openings.models';

type MetaTab = 'advantages' | 'drawbacks' | 'goals';
type CatalogGambitFilter = 'all' | 'gambit' | 'non-gambit';

const PAGE_SIZE = 9;

@Component({
  selector: 'app-opening-explorer-page',
  standalone: true,
  imports: [CommonModule, CoachAvatarComponent],
  templateUrl: './opening-explorer-page.component.html',
  styleUrl: './opening-explorer-page.component.css'
})
export class OpeningExplorerPageComponent implements OnDestroy {
  private readonly lichessExplorer = inject(LichessExplorerService);

  @ViewChild('boardHost')
  private boardHost?: ElementRef<HTMLDivElement>;

  private chessboard: Chessboard | null = null;
  private chess = new Chess();
  private syncGeneration = 0;

  // ── Catalog state ──
  private static readonly POPULARITY_ORDER: string[] = [
    // White (sorted by popularity descending)
    'queens-gambit', 'italian-game', 'english-opening', 'ruy-lopez',
    'london-system', 'catalan-opening', 'scotch-game', 'reti-opening',
    'kings-indian-attack', 'vienna-game', 'four-knights-game',
    'trompowsky-attack', 'bishops-opening', 'colle-system',
    'kings-gambit', 'evans-gambit', 'birds-opening', 'nimzo-larsen-attack',
    // New white openings
    'scotch-gambit', 'smith-morra-gambit', 'milner-barry-gambit',
    'caro-kann-advance-tal', 'mieses-gambit', 'austrian-attack-pirc',
    // Black (sorted by popularity descending)
    'sicilian-defense', 'french-defense', 'caro-kann', 'queens-gambit-declined',
    'kings-indian-defense', 'nimzo-indian-defense', 'slav-defense',
    'grunfeld-defense', 'petrov-defense', 'queens-indian-defense',
    'bogo-indian-defense', 'dutch-defense', 'pirc-defense', 'benoni-defense',
    'scandinavian-defense', 'philidor-defense', 'alekhines-defense', 'modern-defense',
    // New black openings
    'sicilian-dragon', 'benko-gambit', 'leningrad-dutch',
    'reversed-sicilian-english', 'kings-indian-setup-reti', 'budapest-gambit',
  ];

  protected readonly catalog = [...OPENINGS_CATALOG].sort((a, b) => {
    const aIdx = OpeningExplorerPageComponent.POPULARITY_ORDER.indexOf(a.id);
    const bIdx = OpeningExplorerPageComponent.POPULARITY_ORDER.indexOf(b.id);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });
  protected readonly sideLabels = SIDE_LABELS;
  protected readonly sides: OpeningSide[] = ['white', 'black'];
  protected readonly selectedOpening = signal<OpeningDefinition | null>(null);
  protected readonly playerColor = signal<'white' | 'black'>('white');
  protected readonly catalogFilter = signal('');
  protected readonly activeCatalogSide = signal<OpeningSide>('white');
  protected readonly catalogGambitFilter = signal<CatalogGambitFilter>('all');
  protected readonly catalogPageWhite = signal(1);
  protected readonly catalogPageBlack = signal(1);

  // ── Explorer state ──
  protected readonly currentFen = signal(FEN.start);
  protected readonly moveHistory = signal<MoveHistoryEntry[]>([]);
  protected readonly continuations = signal<ExplorerContinuation[]>([]);
  protected readonly loadingContinuations = signal(false);
  protected readonly openingName = signal<string | null>(null);
  protected readonly selectedMoveIndex = signal(-1);
  protected readonly activeMetaTab = signal<MetaTab>('advantages');

  // hovered move UCI — drives single-arrow hover display (opening moves & continuations)
  protected readonly hoveredMoveUci = signal<string | null>(null);

  // index of the opening move chip currently previewed (-1 = full opening / initial position)
  protected readonly openingMoveActiveIndex = signal<number>(-1);

  // UCI of the continuation with the best win rate (shown only when 2+ continuations)
  protected readonly selectedKeySquares = computed(() => this.selectedOpening()?.keySquares ?? []);
  protected readonly selectedPawnBreaks = computed(() => this.selectedOpening()?.pawnBreaks ?? []);

  protected readonly canReset = computed(() =>
    this.moveHistory().length > 0 || this.openingMoveActiveIndex() >= 0
  );

  // parsed tokens from the opening's defining move sequence
  protected readonly openingMoveTokens = computed(() => {
    const opening = this.selectedOpening();
    if (!opening) {
      return [];
    }
    const chess = new Chess();
    const cleanMoves = opening.moves
      .replace(/\d+\.\s*/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(m => m.length > 0);

    const tokens: Array<{ san: string; uci: string; isWhite: boolean; moveNumber: number; fen: string }> = [];
    for (const san of cleanMoves) {
      const fenParts = chess.fen().split(' ');
      const isWhite = fenParts[1] === 'w';
      const fullMove = parseInt(fenParts[5], 10);
      try {
        const move = chess.move(san);
        if (!move) {
          break;
        }
        tokens.push({
          san: move.san,
          uci: move.from + move.to + (move.promotion ?? ''),
          isWhite,
          moveNumber: fullMove,
          fen: chess.fen(),
        });
      } catch {
        break;
      }
    }
    return tokens;
  });

  // true when we're on the opening's base position with key squares shown
  protected readonly isInitialPosition = computed(() => {
    return this.selectedOpening() !== null
      && this.moveHistory().length === 0
      && this.openingMoveActiveIndex() === -1;
  });

  // ── Coach state ──
  protected readonly coachText = computed(() => {
    const opening = this.selectedOpening();
    const history = this.moveHistory();

    if (!opening && history.length === 0) {
      return 'Select an opening from the catalog to begin exploring. Each opening has its own character — find the one that fits your style!';
    }

    if (history.length === 0 && opening) {
      return opening.description;
    }

    const lastMove = history[history.length - 1];
    if (lastMove) {
      return getOpeningMoveCoaching(lastMove.san, lastMove.moveNumber, lastMove.sideToMove);
    }

    return 'Navigate through the opening to see coaching insights for each move.';
  });

  protected readonly currentMoveLabel = computed(() => {
    const history = this.moveHistory();
    if (history.length === 0) {
      return 'Starting Position';
    }
    const last = history[history.length - 1];
    const prefix = last.sideToMove === 'white' ? `${last.moveNumber}.` : `${last.moveNumber}...`;
    return `${prefix} ${last.san}`;
  });

  protected readonly sideToMove = computed((): 'white' | 'black' => {
    const fen = this.currentFen();
    return fen.includes(' w ') ? 'white' : 'black';
  });

  protected readonly filteredCatalog = computed(() => {
    const filter = this.catalogFilter().toLowerCase().trim();
    if (!filter) {
      return this.catalog;
    }
    return this.catalog.filter(o =>
      o.name.toLowerCase().includes(filter) ||
      o.eco.toLowerCase().includes(filter) ||
      o.forSide.includes(filter)
    );
  });

  constructor() {
    effect(() => {
      const fen = this.currentFen();
      const conts = this.continuations();
      const hoveredUci = this.hoveredMoveUci();
      void this.syncBoard(fen, hoveredUci);
    });

    // Reset pagination whenever the text filter or gambit filter changes
    effect(() => {
      this.catalogFilter();
      this.catalogGambitFilter();
      this.catalogPageWhite.set(1);
      this.catalogPageBlack.set(1);
    });
  }

  public ngOnDestroy(): void {
    this.chessboard?.destroy();
    this.chessboard = null;
  }

  // ── Catalog actions ──

  protected getOpeningsForSide(side: OpeningSide): OpeningDefinition[] {
    const all = this.getFilteredOpeningsForSide(side);
    const page = side === 'white' ? this.catalogPageWhite() : this.catalogPageBlack();
    const start = (page - 1) * PAGE_SIZE;
    return all.slice(start, start + PAGE_SIZE);
  }

  protected getTotalPagesForSide(side: OpeningSide): number {
    return Math.max(1, Math.ceil(this.getFilteredOpeningsForSide(side).length / PAGE_SIZE));
  }

  protected getCurrentPage(side: OpeningSide): number {
    return side === 'white' ? this.catalogPageWhite() : this.catalogPageBlack();
  }

  protected nextPage(side: OpeningSide): void {
    const total = this.getTotalPagesForSide(side);
    if (side === 'white') {
      if (this.catalogPageWhite() < total) this.catalogPageWhite.update(p => p + 1);
    } else {
      if (this.catalogPageBlack() < total) this.catalogPageBlack.update(p => p + 1);
    }
  }

  protected prevPage(side: OpeningSide): void {
    if (side === 'white') {
      if (this.catalogPageWhite() > 1) this.catalogPageWhite.update(p => p - 1);
    } else {
      if (this.catalogPageBlack() > 1) this.catalogPageBlack.update(p => p - 1);
    }
  }

  private getFilteredOpeningsForSide(side: OpeningSide): OpeningDefinition[] {
    const gambitFilter = this.catalogGambitFilter();
    const items = this.filteredCatalog().filter(o => o.forSide === side);
    if (gambitFilter === 'gambit') return items.filter(o => !!o.isGambit);
    if (gambitFilter === 'non-gambit') return items.filter(o => !o.isGambit);
    return items;
  }

  protected onFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.catalogFilter.set(value);
  }

  // ── Explorer actions ──

  protected async selectContinuation(continuation: ExplorerContinuation): Promise<void> {
    const uci = continuation.uci;
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promotion = uci.length === 5 ? (uci[4] as 'q' | 'r' | 'b' | 'n') : undefined;

    // Try UCI first; fall back to SAN for castling (O-O / O-O-O) and other edge cases
    let move;
    try {
      move = this.chess.move({ from, to, promotion });
    } catch {
      // UCI parse failed — try SAN notation
    }
    if (!move) {
      try {
        move = this.chess.move(continuation.san);
      } catch {
        return;
      }
    }
    if (!move) {
      return;
    }

    const newFen = this.chess.fen();
    const fenParts = newFen.split(' ');
    // 'b'/'w' is who moves NEXT; derive who just moved and the correct move number
    const activeAfterMove = fenParts[1];
    const fullMoveNumber = parseInt(fenParts[5], 10);
    const sideToMove: 'white' | 'black' = activeAfterMove === 'b' ? 'white' : 'black';
    const moveNumber = activeAfterMove === 'b' ? fullMoveNumber : fullMoveNumber - 1;
    const history = this.moveHistory();

    // On the first continuation move, clear the initial-position board markers
    if (history.length === 0 && this.chessboard) {
      this.chessboard.removeMarkers();
    }

    this.openingMoveActiveIndex.set(-1);

    this.moveHistory.set([
      ...history,
      { fen: newFen, san: move.san, uci, moveNumber, sideToMove }
    ]);
    this.hoveredMoveUci.set(null);
    this.currentFen.set(newFen);
    this.selectedMoveIndex.set(history.length);

    await this.loadContinuations(newFen);
  }

  protected async goToMove(index: number): Promise<void> {
    if (index < -1) {
      return;
    }

    const history = this.moveHistory();

    if (index === -1) {
      // Go to starting position
      this.chess = new Chess();
      const opening = this.selectedOpening();
      if (opening) {
        this.replayMoves(opening.moves);
      }
      this.moveHistory.set([]);
      this.currentFen.set(this.chess.fen());
      this.selectedMoveIndex.set(-1);
      await this.loadContinuations(this.chess.fen());
      return;
    }

    if (index >= history.length) {
      return;
    }

    // Truncate history to the selected index
    const targetHistory = history.slice(0, index + 1);
    const targetFen = targetHistory[index].fen;

    this.chess = new Chess(targetFen);
    this.moveHistory.set(targetHistory);
    this.currentFen.set(targetFen);
    this.selectedMoveIndex.set(index);

    await this.loadContinuations(targetFen);
  }

  protected async goBack(): Promise<void> {
    const history = this.moveHistory();
    if (history.length === 0) {
      return;
    }

    await this.goToMove(history.length - 2);
  }

  protected async goToStart(): Promise<void> {
    const opening = this.selectedOpening();
    this.chess = new Chess();

    if (opening) {
      this.replayMoves(opening.moves);
    }

    this.moveHistory.set([]);
    this.currentFen.set(this.chess.fen());
    this.selectedMoveIndex.set(-1);
    this.openingMoveActiveIndex.set(-1);

    // Re-highlight key squares and pawn breaks
    if (this.chessboard) {
      if (opening) {
        this.highlightBoardMarkers(opening);
      } else {
        this.chessboard.removeMarkers();
      }
    }

    await this.loadContinuations(this.chess.fen());
  }

  protected async resetToInitial(): Promise<void> {
    await this.goToStart();
  }

  protected formatPlayRate(rate: number): string {
    return rate.toFixed(1);
  }

  protected formatWinRate(rate: number): string {
    return rate.toFixed(1);
  }

  protected getBarWidth(rate: number): string {
    return `${Math.max(rate, 2)}%`;
  }

  protected getArrowOpacity(continuation: ExplorerContinuation, allContinuations: ExplorerContinuation[]): number {
    if (allContinuations.length === 0) {
      return 0.8;
    }
    const maxRate = allContinuations[0]?.playRate ?? 1;
    if (maxRate === 0) {
      return 0.3;
    }
    const ratio = continuation.playRate / maxRate;
    return 0.2 + ratio * 0.7;
  }

  protected getWinRateClass(rate: number): string {
    if (rate >= 55) {
      return 'win-rate-good';
    }
    if (rate >= 45) {
      return 'win-rate-neutral';
    }
    return 'win-rate-bad';
  }

  protected isKeyAndBreakSquare(sq: string): boolean {
    const opening = this.selectedOpening();
    if (!opening) return false;
    return (opening.keySquares ?? []).includes(sq) && (opening.pawnBreaks ?? []).includes(sq);
  }

  protected onOpeningMoveHover(uci: string): void {
    if (this.moveHistory().length === 0) {
      this.hoveredMoveUci.set(uci);
    }
  }

  protected async onOpeningMoveClick(tokenIndex: number): Promise<void> {
    const tokens = this.openingMoveTokens();
    if (tokenIndex < 0 || tokenIndex >= tokens.length) return;

    const token = tokens[tokenIndex];
    this.chess = new Chess(token.fen);

    this.moveHistory.set([]);
    this.currentFen.set(token.fen);
    this.openingMoveActiveIndex.set(tokenIndex);
    this.hoveredMoveUci.set(null);

    if (this.chessboard) {
      this.chessboard.removeMarkers();
    }

    await this.loadContinuations(token.fen);
  }

  // ── Private methods ──

  protected selectOpening(opening: OpeningDefinition): void {
    this.playerColor.set(opening.forSide);
    this.selectedOpening.set(opening);
    this.activeMetaTab.set('advantages');
    this.chess = new Chess();
    this.replayMoves(opening.moves);

    const newFen = this.chess.fen();
    this.currentFen.set(newFen);
    this.moveHistory.set([]);
    this.selectedMoveIndex.set(-1);
    this.openingMoveActiveIndex.set(-1);
    this.openingName.set(opening.name);

    // Wait for *ngIf to render the board host
    setTimeout(() => {
      if (this.boardHost) {
        if (this.chessboard) {
          this.chessboard.destroy();
        }
        this.chessboard = new Chessboard(this.boardHost.nativeElement, {
          position: newFen,
          assetsUrl: 'assets/cm-chessboard/',
          orientation: opening.forSide === 'black' ? COLOR.black : COLOR.white,
          style: {
            borderType: BORDER_TYPE.frame,
            showCoordinates: true,
            pieces: { file: '/assets/images/chess%20set/svgs/pieces.svg' }
          },
          extensions: [
            { class: Markers },
            { class: Arrows }
          ]
        });

        // Highlight key squares and pawn breaks
        this.highlightBoardMarkers(opening);
      }

      void this.loadContinuations(newFen);
    }, 0);
  }

  private replayMoves(movesStr: string): void {
    const cleanMoves = movesStr
      .replace(/\d+\.\s*/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(m => m.length > 0);

    for (const move of cleanMoves) {
      this.chess.move(move);
    }
  }

  private replayToOpeningBase(opening: OpeningDefinition): void {
    this.chess = new Chess();
    this.replayMoves(opening.moves);
  }

  private async loadContinuations(fen: string): Promise<void> {
    // Clear immediately so the board effect fires with no arrows while loading
    this.continuations.set([]);
    this.loadingContinuations.set(true);
    try {
      const result = await this.lichessExplorer.getContinuations(fen, this.playerColor());
      // Only update if we're still on the same position
      if (this.currentFen() === fen) {
        this.continuations.set(result);
      }
    } catch {
      if (this.currentFen() === fen) {
        this.continuations.set([]);
      }
    } finally {
      this.loadingContinuations.set(false);
    }
  }

  private async syncBoard(fen: string, hoveredUci: string | null): Promise<void> {
    if (!this.chessboard) {
      return;
    }

    // Bump the generation so any previous in-flight call can detect it was superseded
    const gen = ++this.syncGeneration;

    await this.chessboard.setPosition(fen, true);

    // Another syncBoard started after us — don't touch arrows
    if (gen !== this.syncGeneration) {
      return;
    }

    this.chessboard.removeArrows();

    // Draw the arrow for whatever move is currently hovered (continuation or opening move)
    if (hoveredUci && hoveredUci.length >= 4) {
      const from = hoveredUci.slice(0, 2);
      const to = hoveredUci.slice(2, 4);
      try {
        this.chessboard.addArrow({ class: 'arrow-continuation' }, from, to);
      } catch {
        // ignore invalid positions
      }
    }
  }

  private highlightBoardMarkers(opening: OpeningDefinition): void {
    if (!this.chessboard) return;

    this.chessboard.removeMarkers();

    const keySet = new Set(opening.keySquares ?? []);
    const breakSet = new Set(opening.pawnBreaks ?? []);
    const allSquares = new Set([...keySet, ...breakSet]);

    const keyOnlyMarker: MarkerType = { class: 'marker-key-square', slice: 'markerSquare' };
    const breakOnlyMarker: MarkerType = { class: 'marker-pawn-break', slice: 'markerSquare' };
    const bothMarker: MarkerType = { class: 'marker-key-pawn-break', slice: 'markerSquare' };

    for (const sq of allSquares) {
      const isKey = keySet.has(sq);
      const isBreak = breakSet.has(sq);
      if (isKey && isBreak) {
        this.chessboard.addMarker(bothMarker, sq);
      } else if (isKey) {
        this.chessboard.addMarker(keyOnlyMarker, sq);
      } else {
        this.chessboard.addMarker(breakOnlyMarker, sq);
      }
    }
  }
}
