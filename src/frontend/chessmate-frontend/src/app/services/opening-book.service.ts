import { Injectable } from '@angular/core';

/**
 * Service that checks whether a board position is part of standard opening theory.
 * Uses a curated static ECO JSON file bundled in the app assets.
 */
@Injectable({ providedIn: 'root' })
export class OpeningBookService {
  private bookPositions: Set<string> | null = null;
  private loadingPromise: Promise<Set<string>> | null = null;

  /**
   * Check if a FEN position is a known opening book position.
   * Only the piece-placement portion of the FEN is compared.
   */
  public async isBookPosition(fen: string): Promise<boolean> {
    const positions = await this.ensureLoaded();
    const boardFen = this.extractBoardFen(fen);
    return positions.has(boardFen);
  }

  /**
   * Synchronous check — returns false if book data hasn't loaded yet.
   * Use after initial load to avoid async overhead during classification.
   */
  public isBookPositionSync(fen: string): boolean {
    if (!this.bookPositions) {
      return false;
    }

    const boardFen = this.extractBoardFen(fen);
    return this.bookPositions.has(boardFen);
  }

  /**
   * Pre-load the opening book data. Call once before classification begins.
   */
  public async preload(): Promise<void> {
    await this.ensureLoaded();
  }

  private async ensureLoaded(): Promise<Set<string>> {
    if (this.bookPositions) {
      return this.bookPositions;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadBookData();
    this.bookPositions = await this.loadingPromise;
    this.loadingPromise = null;
    return this.bookPositions;
  }

  private async loadBookData(): Promise<Set<string>> {
    try {
      const response = await fetch('assets/data/eco-openings.json');

      if (!response.ok) {
        console.warn('Failed to load ECO opening book. Book move detection disabled.');
        return new Set<string>();
      }

      const data = await response.json();
      const positions: string[] = data?.positions ?? [];
      return new Set(positions);
    } catch (error) {
      console.warn('Error loading ECO opening book:', error);
      return new Set<string>();
    }
  }

  private extractBoardFen(fen: string): string {
    const spaceIndex = fen.indexOf(' ');

    if (spaceIndex === -1) {
      return fen;
    }

    return fen.substring(0, spaceIndex);
  }
}
