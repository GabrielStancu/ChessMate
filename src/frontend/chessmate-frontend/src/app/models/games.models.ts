export interface GetGamesItemEnvelope {
  gameId: string;
  playedAtUtc: string;
  opponent: string;
  result: string;
  opening: string;
  timeControl: string;
  url: string;
}

export interface GetGamesResponseEnvelope {
  schemaVersion: string;
  items: GetGamesItemEnvelope[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  sourceTimestamp: string;
  cacheStatus: string;
  cacheTtlMinutes: number;
}

export interface ErrorResponseEnvelope {
  schemaVersion: string;
  correlationId: string;
  code: string;
  message: string;
  errors?: Record<string, string[]>;
}
