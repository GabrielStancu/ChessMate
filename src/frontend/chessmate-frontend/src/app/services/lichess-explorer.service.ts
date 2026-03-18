import { Injectable } from '@angular/core';
import { ExplorerContinuation, LichessExplorerResponse } from '../models/openings.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LichessExplorerService {
  private readonly mastersUrl = `${environment.apiBaseUrl}/lichess/explorer/masters`;
  private readonly lichessUrl = `${environment.apiBaseUrl}/lichess/explorer/lichess`;

  public async getContinuations(
    fen: string,
    playerColor: 'white' | 'black',
    maxMoves: number = 5
  ): Promise<ExplorerContinuation[]> {
    try {
      return await this.fetchFromLichess(fen, playerColor, maxMoves);
    } catch {
      try {
        return await this.fetchFromMasters(fen, playerColor, maxMoves);
      } catch {
        return [];
      }
    }
  }

  private async fetchFromMasters(
    fen: string,
    playerColor: 'white' | 'black',
    maxMoves: number
  ): Promise<ExplorerContinuation[]> {
    const url = `${this.mastersUrl}?fen=${encodeURIComponent(fen)}&moves=${maxMoves}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Masters API error: ${response.status}`);
    }
    const data: LichessExplorerResponse = await response.json();
    return this.mapResponse(data, playerColor);
  }

  private async fetchFromLichess(
    fen: string,
    playerColor: 'white' | 'black',
    maxMoves: number
  ): Promise<ExplorerContinuation[]> {
    const url = `${this.lichessUrl}?fen=${encodeURIComponent(fen)}&ratings=1000,1200,1400,1600,1800,2000,2200,2500&speeds=bullet,blitz,rapid,classical&moves=${maxMoves}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Lichess API error: ${response.status}`);
    }
    const data: LichessExplorerResponse = await response.json();
    return this.mapResponse(data, playerColor);
  }

  private mapResponse(response: LichessExplorerResponse, playerColor: 'white' | 'black'): ExplorerContinuation[] {
    if (!response?.moves?.length) {
      return [];
    }

    const totalGamesAll = response.moves.reduce(
      (sum, m) => sum + m.white + m.draws + m.black,
      0
    );

    return response.moves.map(move => {
      const total = move.white + move.draws + move.black;
      const whiteWinRate = total > 0 ? (move.white / total) * 100 : 0;
      const drawRate = total > 0 ? (move.draws / total) * 100 : 0;
      const blackWinRate = total > 0 ? (move.black / total) * 100 : 0;
      const playRate = totalGamesAll > 0 ? (total / totalGamesAll) * 100 : 0;

      return {
        uci: move.uci,
        san: move.san,
        totalGames: total,
        playRate,
        whiteWinRate,
        drawRate,
        blackWinRate,
        winRateFromPerspective: playerColor === 'white' ? whiteWinRate : blackWinRate
      };
    }).sort((a, b) => b.playRate - a.playRate);
  }
}
