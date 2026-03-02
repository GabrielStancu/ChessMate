import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GetGamesResponseEnvelope } from '../models/games.models';

@Injectable({ providedIn: 'root' })
export class GamesApiService {
  private static readonly pageSize = 12;

  public constructor(private readonly httpClient: HttpClient) {}

  public getGames(username: string, page: number, forceRefresh = false): Observable<GetGamesResponseEnvelope> {
    const endpoint = `${this.getBaseApiUrl()}/chesscom/users/${encodeURIComponent(username)}/games`;
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', GamesApiService.pageSize.toString());

    if (forceRefresh) {
      params = params.set('forceRefresh', 'true');
    }

    return this.httpClient.get<GetGamesResponseEnvelope>(endpoint, { params });
  }

  private getBaseApiUrl(): string {
    const value = environment.apiBaseUrl.trim();
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }
}
