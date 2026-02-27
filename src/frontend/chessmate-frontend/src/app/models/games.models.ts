export interface GetGamesItemEnvelope {
  gameId: string;
  playedAtUtc: string;
  whitePlayer: string;
  blackPlayer: string;
  whiteRating?: number | null;
  blackRating?: number | null;
  playerColor: 'white' | 'black';
  opponent: string;
  result: string;
  opening: string;
  timeControl: string;
  url: string;
  pgn?: string;
  initialFen?: string;
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
