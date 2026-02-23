export type AnalysisMode = 'quick' | 'deep';

export interface EngineConfig {
  depth: number;
  threads: number;
  timePerMoveMs: number;
}

export interface PositionEvaluation {
  fen: string;
  bestMove: string | null;
  centipawn: number | null;
  mate: number | null;
  depth: number | null;
  principalVariation: string | null;
  cached: boolean;
}

export interface AnalysisMetadata {
  mode: AnalysisMode;
  engineConfig: EngineConfig;
}

export const QUICK_ENGINE_CONFIG: EngineConfig = {
  depth: 12,
  threads: 1,
  timePerMoveMs: 150
};

export const DEEP_ENGINE_CONFIG: EngineConfig = {
  depth: 20,
  threads: 1,
  timePerMoveMs: 600
};

export const ENGINE_CONFIG_LIMITS = {
  depth: { min: 6, max: 24 },
  threads: { min: 1, max: 1 },
  timePerMoveMs: { min: 50, max: 10_000 }
} as const;

export class StaleEvaluationError extends Error {
  public constructor() {
    super('Evaluation request is stale and was ignored.');
    this.name = 'StaleEvaluationError';
  }
}
