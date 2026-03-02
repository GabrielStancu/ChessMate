import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { EngineConfig } from '../models/analysis.models';
import {
  AnalysisCacheResponseEnvelope,
  BatchCoachRequestPayload,
  BatchCoachResponseEnvelope
} from '../models/batch-coach.models';

@Injectable({ providedIn: 'root' })
export class BatchCoachApiService {

  public constructor(private readonly httpClient: HttpClient) {}

  /**
   * Submit classified moves for AI coaching generation.
   * Returns the unified batch-coach response envelope.
   */
  public async submitBatchCoach(
    payload: BatchCoachRequestPayload,
    idempotencyKey: string
  ): Promise<BatchCoachResponseEnvelope> {
    const endpoint = `${this.getBaseApiUrl()}/analysis/batch-coach`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    });

    return firstValueFrom(
      this.httpClient.post<BatchCoachResponseEnvelope>(endpoint, payload, { headers })
    );
  }

  public async getAnalysisCache(
    gameId: string,
    analysisMode: string,
    config: EngineConfig
  ): Promise<AnalysisCacheResponseEnvelope> {
    const endpoint = `${this.getBaseApiUrl()}/analysis/cache/${encodeURIComponent(gameId)}`;

    return firstValueFrom(
      this.httpClient.get<AnalysisCacheResponseEnvelope>(endpoint, {
        params: {
          analysisMode,
          depth: String(config.depth),
          threads: String(config.threads),
          timePerMoveMs: String(config.timePerMoveMs)
        }
      })
    );
  }

  private getBaseApiUrl(): string {
    const value = environment.apiBaseUrl.trim();
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }
}
