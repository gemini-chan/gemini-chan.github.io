/**
 * Core types and interfaces for Live2D integration
 */

export interface PixiApplicationLike {
  renderer: {
    width: number;
    height: number;
    resize: (w: number, h: number) => void;
  };
  stage: {
    addChild: (child: any) => void;
    removeChild: (child: any) => void;
  };
  ticker?: { start?: () => void; stop?: () => void };
}

export interface Live2DModelLike extends EventTarget {
  anchor?: { set: (x: number, y: number) => void } | any;
  scale?: { set: (x: number, y: number) => void } | any;
  position?: { set: (x: number, y: number) => void } | any;
  width?: number;
  height?: number;
  destroy?: () => void;
}

export interface Live2DModelConfig {
  /** URL to a .model3.json or a .zip that contains the model */
  url: string;
  /** Model scale relative to canvas */
  scale?: number;
  /** Anchor (0..1) for X and Y */
  anchor?: [number, number];
  /** Optional automatic fit to canvas */
  fitToCanvas?: boolean;
}

export interface AudioAnalysisProvider {
  /** Node carrying microphone input (upstream) */
  inputNode?: AudioNode;
  /** Node carrying assistant output (downstream) */
  outputNode?: AudioNode;
}
