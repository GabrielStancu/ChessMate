import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { FullGameAnalysisResult } from '../models/classification.models';

@Injectable({ providedIn: 'root' })
export class AnalysisCacheApiService {
  public constructor(private readonly httpClient: HttpClient) {}

  public async getCache(gameId: string, mode: string, depth: number): Promise<FullGameAnalysisResult | null> {
    const endpoint = `${this.getBaseApiUrl()}/analysis/cache/${encodeURIComponent(gameId)}`;
    const params = new HttpParams()
      .set('mode', mode)
      .set('depth', depth.toString());

    try {
      return await firstValueFrom(
        this.httpClient.get<FullGameAnalysisResult>(endpoint, { params })
      );
    } catch {
      return null;
    }
  }

  public async putCache(gameId: string, mode: string, depth: number, result: FullGameAnalysisResult): Promise<void> {
    const endpoint = `${this.getBaseApiUrl()}/analysis/cache/${encodeURIComponent(gameId)}`;
    const params = new HttpParams()
      .set('mode', mode)
      .set('depth', depth.toString());

    try {
      await firstValueFrom(
        this.httpClient.put(endpoint, result, { params, responseType: 'text' as const })
      );
    } catch {
      // Cache write is best-effort — don't block the user experience
    }
  }

  private getBaseApiUrl(): string {
    const value = environment.apiBaseUrl.trim();
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }
}
