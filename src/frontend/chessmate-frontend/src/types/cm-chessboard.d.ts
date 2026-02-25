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

  export const COLOR: {
    white: string;
    black: string;
  };

  export class Chessboard {
    public constructor(context: HTMLElement, props?: unknown);
    public setPosition(fen: string, animated?: boolean): Promise<void>;
    public setOrientation(color: string, animated?: boolean): Promise<void>;
    public getOrientation(): string;
    public getPiece(square: string): string | undefined;
    public addMarker(type: MarkerType, square: string): void;
    public getMarkers(type?: MarkerType, square?: string): unknown[];
    public removeMarkers(type?: MarkerType, square?: string): void;
    public addArrow(type: ArrowType, from: string, to: string): void;
    public getArrows(type?: ArrowType, from?: string, to?: string): unknown[];
    public removeArrows(type?: ArrowType, from?: string, to?: string): void;
    public destroy(): void;
  }

  export interface MarkerType {
    class: string;
    slice: string;
    position?: string;
  }

  export interface ArrowType {
    class: string;
  }
}

declare module 'cm-chessboard/src/extensions/markers/Markers.js' {
  import { Chessboard, MarkerType } from 'cm-chessboard/src/Chessboard.js';

  export const MARKER_TYPE: {
    frame: MarkerType;
    framePrimary: MarkerType;
    frameDanger: MarkerType;
    circle: MarkerType;
    circlePrimary: MarkerType;
    circleDanger: MarkerType;
    circleDangerFilled: MarkerType;
    square: MarkerType;
    dot: MarkerType;
    bevel: MarkerType;
  };

  export class Markers {
    public constructor(chessboard: Chessboard, props?: unknown);
  }
}

declare module 'cm-chessboard/src/extensions/arrows/Arrows.js' {
  import { ArrowType, Chessboard } from 'cm-chessboard/src/Chessboard.js';

  export const ARROW_TYPE: {
    default: ArrowType;
    success: ArrowType;
    secondary: ArrowType;
    warning: ArrowType;
    info: ArrowType;
    danger: ArrowType;
  };

  export class Arrows {
    public constructor(chessboard: Chessboard, props?: unknown);
  }
}
