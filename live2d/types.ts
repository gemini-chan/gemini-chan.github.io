/**
 * Core types and interfaces for Live2D integration
 */

export interface PixiDisplayObjectLike {
  width: number
  height: number
}

export interface PointLike {
  x: number
  y: number
}

export interface PixiApplicationLike {
  view: HTMLCanvasElement
  renderer: {
    width: number
    height: number
    resize: (w: number, h: number) => void
  }
  stage: {
    addChild: <T extends PixiDisplayObjectLike>(child: T) => T
    removeChild: <T extends PixiDisplayObjectLike>(child: T) => T
  }
  ticker?: { start?: () => void; stop?: () => void }
  destroy: (removeView?: boolean) => void
  screen: { width: number; height: number }
}

export interface Live2DModelLike extends EventTarget {
  anchor?: PointLike
  scale?: PointLike
  position?: PointLike
  width?: number
  height?: number
  destroy?: () => void
}

export interface Live2DModelConfig {
  /** URL to a .model3.json or a .zip that contains the model */
  url: string
  /** Model scale relative to canvas */
  scale?: number
  /** Anchor (0..1) for X and Y */
  anchor?: [number, number]
  /** Optional automatic fit to canvas */
  fitToCanvas?: boolean
}

export interface AudioAnalysisProvider {
  /** Node carrying microphone input (upstream) */
  inputNode?: AudioNode
  /** Node carrying assistant output (downstream) */
  outputNode?: AudioNode
}
