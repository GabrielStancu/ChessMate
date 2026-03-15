import { Injectable } from '@angular/core';
import { FullGameAnalysisResult } from '../models/classification.models';
import { GetGamesItemEnvelope } from '../models/games.models';

@Injectable({ providedIn: 'root' })
export class AnalysisSessionService {
  private static readonly selectedGameStorageKey = 'chessmate.selectedGame';
  private static readonly fullAnalysisStorageKey = 'chessmate.fullAnalysis';

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

  public setFullGameAnalysis(result: FullGameAnalysisResult): void {
    sessionStorage.setItem(AnalysisSessionService.fullAnalysisStorageKey, JSON.stringify(result));
  }

  public getFullGameAnalysis(expectedGameId: string): FullGameAnalysisResult | null {
    const rawValue = sessionStorage.getItem(AnalysisSessionService.fullAnalysisStorageKey);
    if (!rawValue) {
      return null;
    }

    try {
      const result = JSON.parse(rawValue) as FullGameAnalysisResult;
      if (result.gameId !== expectedGameId) {
        return null;
      }

      return result;
    } catch {
      return null;
    }
  }

  public clearFullGameAnalysis(): void {
    sessionStorage.removeItem(AnalysisSessionService.fullAnalysisStorageKey);
  }
}
