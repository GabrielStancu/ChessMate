declare module 'cm-chessboard/src/Chessboard.js' {
  export const FEN: {
    start: string;
    empty: string;
  };

  export const BORDER_TYPE: {
    none: string;
    thin: string;
    frame: string;
  };

  export class Chessboard {
    public constructor(context: HTMLElement, props?: unknown);
    public setPosition(fen: string, animated?: boolean): Promise<void>;
    public destroy(): void;
  }
}
