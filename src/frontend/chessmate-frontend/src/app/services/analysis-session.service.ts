import { Injectable } from '@angular/core';
import { GetGamesItemEnvelope } from '../models/games.models';

@Injectable({ providedIn: 'root' })
export class AnalysisSessionService {
  private static readonly selectedGameStorageKey = 'chessmate.selectedGame';

  public setSelectedGame(game: GetGamesItemEnvelope): void {
    sessionStorage.setItem(AnalysisSessionService.selectedGameStorageKey, JSON.stringify(game));
  }

  public getSelectedGame(expectedGameId: string): GetGamesItemEnvelope | null {
    const rawValue = sessionStorage.getItem(AnalysisSessionService.selectedGameStorageKey);
    if (!rawValue) {
      return null;
    }

    try {
      const game = JSON.parse(rawValue) as GetGamesItemEnvelope;
      if (game.gameId !== expectedGameId) {
        return null;
      }

      return game;
    } catch {
      return null;
    }
  }
}
