import { Injectable, OnDestroy } from '@angular/core';
import {
  AnalysisMode,
  DEEP_ENGINE_CONFIG,
  ENGINE_CONFIG_LIMITS,
  EngineConfig,
  PositionEvaluation,
  QUICK_ENGINE_CONFIG,
  StaleEvaluationError
} from '../models/analysis.models';

interface StockfishInfoSnapshot {
  depth: number | null;
  centipawn: number | null;
  mate: number | null;
  principalVariation: string | null;
  secondBestCentipawn: number | null;
  secondBestMate: number | null;
}

interface PendingEvaluationRequest {
  fen: string;
  config: EngineConfig;
  cacheKey: string;
  latestInfo: StockfishInfoSnapshot;
  stopTimerId: ReturnType<typeof setTimeout>;
  timeoutId: ReturnType<typeof setTimeout>;
  resolve: (result: PositionEvaluation) => void;
  reject: (error: unknown) => void;
}

type InitPhase = 'none' | 'waiting-uciok' | 'waiting-readyok' | 'ready';

/** Hash table size in MB. 128 MB gives good transposition reuse for game analysis. */
const DEFAULT_HASH_MB = 128;

@Injectable({ providedIn: 'root' })
export class StockfishAnalysisControllerService implements OnDestroy {
  private static readonly stopGraceMs = 1_500;

  private readonly evaluationCache = new Map<string, PositionEvaluation>();
  private worker: Worker | null = null;
  private pendingRequest: PendingEvaluationRequest | null = null;
  private isReady = false;

  private initPhase: InitPhase = 'none';
  private initPromise: Promise<void> | null = null;
  private initResolve: (() => void) | null = null;
  private initReject: ((error: unknown) => void) | null = null;

  /** Track currently applied options to avoid redundant setoption calls. */
  private appliedThreads = 0;
  private appliedHash = 0;

  private pendingReadyResolve: (() => void) | null = null;

  public ngOnDestroy(): void {
    this.rejectPendingRequest(new StaleEvaluationError());
    this.resetWorker();
  }

  public getPreset(mode: AnalysisMode): EngineConfig {
    if (mode === 'quick') {
      return { ...QUICK_ENGINE_CONFIG };
    }

    return { ...DEEP_ENGINE_CONFIG };
  }

  public validateEngineConfig(config: EngineConfig): EngineConfig {
    if (!Number.isInteger(config.depth)) {
      throw new Error('Depth must be an integer value.');
    }

    if (config.depth < ENGINE_CONFIG_LIMITS.depth.min || config.depth > ENGINE_CONFIG_LIMITS.depth.max) {
      throw new Error(`Depth must be between ${ENGINE_CONFIG_LIMITS.depth.min} and ${ENGINE_CONFIG_LIMITS.depth.max}.`);
    }

    if (!Number.isInteger(config.threads)) {
      throw new Error('Threads must be an integer value.');
    }

    if (config.threads < ENGINE_CONFIG_LIMITS.threads.min || config.threads > ENGINE_CONFIG_LIMITS.threads.max) {
      throw new Error(
        `Threads must be between ${ENGINE_CONFIG_LIMITS.threads.min} and ${ENGINE_CONFIG_LIMITS.threads.max}.`
      );
    }

    if (!Number.isInteger(config.timePerMoveMs)) {
      throw new Error('Time per move must be an integer value.');
    }

    if (
      config.timePerMoveMs < ENGINE_CONFIG_LIMITS.timePerMoveMs.min ||
      config.timePerMoveMs > ENGINE_CONFIG_LIMITS.timePerMoveMs.max
    ) {
      throw new Error(
        `Time per move must be between ${ENGINE_CONFIG_LIMITS.timePerMoveMs.min} and ${ENGINE_CONFIG_LIMITS.timePerMoveMs.max} ms.`
      );
    }

    return {
      depth: config.depth,
      threads: config.threads,
      timePerMoveMs: config.timePerMoveMs
    };
  }

  public async evaluatePosition(fen: string, requestedConfig: EngineConfig): Promise<PositionEvaluation> {
    const normalizedFen = fen.trim();
    if (!normalizedFen) {
      throw new Error('FEN is required to evaluate a position.');
    }

    const config = this.validateEngineConfig(requestedConfig);
    const cacheKey = this.getCacheKey(normalizedFen, config);
    const cached = this.evaluationCache.get(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true
      };
    }

    await this.ensureEngineReady(config);
    this.cancelInFlightEvaluation();
    await this.applyOptionsIfChanged(config);

    const worker = this.worker!;

    return await new Promise<PositionEvaluation>((resolve, reject) => {
      const timeoutMs = config.timePerMoveMs + StockfishAnalysisControllerService.stopGraceMs;
      const stopTimerId = setTimeout(() => {
        if (!this.pendingRequest || this.pendingRequest.cacheKey !== cacheKey) {
          return;
        }

        this.worker?.postMessage('stop');
      }, config.timePerMoveMs);

      const timeoutId = setTimeout(() => {
        if (!this.pendingRequest || this.pendingRequest.cacheKey !== cacheKey) {
          return;
        }

        this.worker?.postMessage('stop');
        this.completePendingRequestWithLatestInfo();
      }, timeoutMs);

      this.pendingRequest = {
        fen: normalizedFen,
        config,
        cacheKey,
        latestInfo: {
          depth: null,
          centipawn: null,
          mate: null,
          principalVariation: null,
          secondBestCentipawn: null,
          secondBestMate: null
        },
        stopTimerId,
        timeoutId,
        resolve,
        reject
      };

      worker.postMessage(`position fen ${normalizedFen}`);
      worker.postMessage(`go depth ${config.depth} movetime ${config.timePerMoveMs}`);
    });
  }

  public cancelInFlightEvaluation(): void {
    if (!this.pendingRequest) {
      return;
    }

    this.rejectPendingRequest(new StaleEvaluationError());
    this.worker?.postMessage('stop');
  }

  private getCacheKey(fen: string, config: EngineConfig): string {
    return `${fen}|d:${config.depth}|t:${config.threads}|m:${config.timePerMoveMs}`;
  }

  /**
   * Ensure the Stockfish worker is created and has completed the full UCI
   * handshake: uci → uciok → setoption(s) → isready → readyok.
   * Options are only sent after uciok so the engine actually applies them.
   */
  private async ensureEngineReady(config: EngineConfig): Promise<void> {
    if (this.initPhase === 'ready') {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;
      this.createWorker(config);
    });

    return this.initPromise;
  }

  private createWorker(initialConfig: EngineConfig): void {
    const supportsThreads = typeof SharedArrayBuffer !== 'undefined';
    const scriptName = supportsThreads
      ? 'assets/stockfish/stockfish-18.js'
      : 'assets/stockfish/stockfish-18-single.js';

    const worker = new Worker(scriptName);
    worker.onmessage = event => this.onWorkerMessage(String(event.data ?? ''), initialConfig);
    worker.onerror = error => this.onWorkerError(error);
    worker.onmessageerror = () => this.onWorkerFatal('Stockfish worker emitted an invalid message payload.');

    this.worker = worker;
    this.initPhase = 'waiting-uciok';
    worker.postMessage('uci');
  }

  /**
   * Send option changes only when values differ from what is already applied,
   * then sync with isready/readyok before returning.
   */
  private async applyOptionsIfChanged(config: EngineConfig): Promise<void> {
    if (!this.worker) {
      return;
    }

    let changed = false;

    if (config.threads !== this.appliedThreads) {
      this.worker.postMessage(`setoption name Threads value ${config.threads}`);
      this.appliedThreads = config.threads;
      changed = true;
    }

    if (changed) {
      this.worker.postMessage('isready');
      await new Promise<void>(resolve => {
        this.pendingReadyResolve = resolve;
      });
    }
  }

  private onWorkerMessage(line: string, initialConfig?: EngineConfig): void {
    if (!line) {
      return;
    }

    if (this.isFatalRuntimeMessage(line)) {
      this.onWorkerFatal('Stockfish worker encountered a runtime failure.');
      return;
    }

    // UCI handshake phase 1: after receiving uciok, send initial options
    if (line === 'uciok' && this.initPhase === 'waiting-uciok') {
      const config = initialConfig ?? { threads: 1, depth: 12, timePerMoveMs: 250 };

      this.worker!.postMessage(`setoption name Threads value ${config.threads}`);
      this.appliedThreads = config.threads;

      this.worker!.postMessage(`setoption name Hash value ${DEFAULT_HASH_MB}`);
      this.appliedHash = DEFAULT_HASH_MB;

      this.worker!.postMessage('setoption name MultiPV value 2');

      this.initPhase = 'waiting-readyok';
      this.worker!.postMessage('isready');
      return;
    }

    if (line === 'readyok') {
      // Resolve init handshake
      if (this.initPhase === 'waiting-readyok') {
        this.initPhase = 'ready';
        this.isReady = true;
        this.initResolve?.();
        this.initResolve = null;
        this.initReject = null;
        return;
      }

      // Resolve mid-session isready sync (option changes)
      this.isReady = true;
      if (this.pendingReadyResolve) {
        const resolve = this.pendingReadyResolve;
        this.pendingReadyResolve = null;
        resolve();
      }
      return;
    }

    if (!this.pendingRequest) {
      return;
    }

    if (line.startsWith('info ')) {
      this.pendingRequest.latestInfo = this.parseInfoLine(line, this.pendingRequest.latestInfo);
      return;
    }

    if (!line.startsWith('bestmove')) {
      return;
    }

    const request = this.pendingRequest;
    clearTimeout(request.stopTimerId);
    clearTimeout(request.timeoutId);
    this.pendingRequest = null;

    const bestMove = this.parseBestMove(line);
    const result: PositionEvaluation = {
      fen: request.fen,
      bestMove,
      centipawn: request.latestInfo.centipawn,
      mate: request.latestInfo.mate,
      depth: request.latestInfo.depth,
      principalVariation: request.latestInfo.principalVariation,
      cached: false,
      secondBestCentipawn: request.latestInfo.secondBestCentipawn,
      secondBestMate: request.latestInfo.secondBestMate
    };

    this.evaluationCache.set(request.cacheKey, result);
    request.resolve(result);
  }

  private onWorkerError(error: ErrorEvent): void {
    this.onWorkerFatal(error.message || 'Stockfish worker failed.');
  }

  private onWorkerFatal(message: string): void {
    const fatalError = new Error(message);
    this.rejectPendingRequest(fatalError);
    this.initReject?.(fatalError);
    this.initResolve = null;
    this.initReject = null;
    this.pendingReadyResolve = null;
    this.resetWorker();
  }

  private rejectPendingRequest(error: unknown): void {
    if (!this.pendingRequest) {
      return;
    }

    const request = this.pendingRequest;
    clearTimeout(request.stopTimerId);
    clearTimeout(request.timeoutId);
    this.pendingRequest = null;
    request.reject(error);
  }

  private completePendingRequestWithLatestInfo(): void {
    if (!this.pendingRequest) {
      return;
    }

    const request = this.pendingRequest;
    clearTimeout(request.stopTimerId);
    clearTimeout(request.timeoutId);
    this.pendingRequest = null;

    const inferredBestMove = this.inferBestMoveFromPrincipalVariation(request.latestInfo.principalVariation);
    const result: PositionEvaluation = {
      fen: request.fen,
      bestMove: inferredBestMove,
      centipawn: request.latestInfo.centipawn,
      mate: request.latestInfo.mate,
      depth: request.latestInfo.depth,
      principalVariation: request.latestInfo.principalVariation,
      cached: false,
      secondBestCentipawn: request.latestInfo.secondBestCentipawn,
      secondBestMate: request.latestInfo.secondBestMate
    };

    this.evaluationCache.set(request.cacheKey, result);
    request.resolve(result);
  }

  private inferBestMoveFromPrincipalVariation(principalVariation: string | null): string | null {
    if (!principalVariation) {
      return null;
    }

    const firstToken = principalVariation.trim().split(/\s+/)[0];
    if (!firstToken) {
      return null;
    }

    return /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(firstToken) ? firstToken.toLowerCase() : null;
  }

  private resetWorker(): void {
    this.worker?.terminate();
    this.worker = null;
    this.isReady = false;
    this.initPhase = 'none';
    this.initPromise = null;
    this.appliedThreads = 0;
    this.appliedHash = 0;
  }

  private isFatalRuntimeMessage(line: string): boolean {
    const normalized = line.toLowerCase();
    return (
      normalized.includes('runtimeerror') ||
      normalized.includes('unreachable') ||
      normalized.includes('index out of bounds') ||
      normalized.includes('indirect call to null')
    );
  }

  private parseBestMove(line: string): string | null {
    const parts = line.split(' ');
    if (parts.length < 2 || parts[1] === '(none)') {
      return null;
    }

    return parts[1];
  }

  private parseInfoLine(line: string, previous: StockfishInfoSnapshot): StockfishInfoSnapshot {
    const multipvMatch = line.match(/\bmultipv\s+(\d+)/);
    const pvIndex = multipvMatch ? Number(multipvMatch[1]) : 1;

    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    const centipawnMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
    const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
    const principalVariationMatch = line.match(/\bpv\s+(.+)$/);

    if (pvIndex === 2) {
      return {
        ...previous,
        secondBestCentipawn: centipawnMatch ? Number(centipawnMatch[1]) : previous.secondBestCentipawn,
        secondBestMate: mateMatch ? Number(mateMatch[1]) : previous.secondBestMate
      };
    }

    return {
      depth: depthMatch ? Number(depthMatch[1]) : previous.depth,
      centipawn: centipawnMatch ? Number(centipawnMatch[1]) : previous.centipawn,
      mate: mateMatch ? Number(mateMatch[1]) : previous.mate,
      principalVariation: principalVariationMatch ? principalVariationMatch[1] : previous.principalVariation,
      secondBestCentipawn: previous.secondBestCentipawn,
      secondBestMate: previous.secondBestMate
    };
  }
}
