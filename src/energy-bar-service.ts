import { createComponentLogger } from "./debug-logger";

export type EnergyLevel = 0 | 1 | 2 | 3;
export type EnergyMode = "sts" | "tts";

export interface EnergyState {
  level: EnergyLevel;
  modelTier: string | null;
}

export interface EnergyLevelChangedDetail extends EnergyState {
  reason: "rate-limit-exceeded" | "session-reset" | "manual";
  prevLevel: EnergyLevel;
  mode: EnergyMode;
}

const logger = createComponentLogger("energy-bar-system");

// Mapping based on design spec (STS)
const STS_MODEL_TIER_BY_LEVEL: Record<EnergyLevel, string | null> = {
  3: "gemini-2.5-flash-exp-native-audio-thinking-dialog",
  2: "gemini-2.5-flash-preview-native-audio-dialog",
  1: "gemini-2.5-flash-live-preview",
  0: null,
};

// TTS mapping: keep a stable live preview model for 3/2/1; 0 = exhausted
const TTS_MODEL_TIER_BY_LEVEL: Record<EnergyLevel, string | null> = {
  3: "gemini-live-2.5-flash-preview",
  2: "gemini-live-2.5-flash-preview",
  1: "gemini-live-2.5-flash-preview",
  0: null,
};

/**
 * Singleton service managing the Energy Bar state for both STS and TTS modes.
 * Emits `energy-level-changed` CustomEvent<EnergyLevelChangedDetail> on changes.
 */
export class EnergyBarService extends EventTarget {
  private static _instance: EnergyBarService | null = null;
  private _levels: Record<EnergyMode, EnergyLevel> = { sts: 3, tts: 3 };

  static get instance(): EnergyBarService {
    if (!EnergyBarService._instance)
      EnergyBarService._instance = new EnergyBarService();
    return EnergyBarService._instance;
  }

  /** Get the current energy level (0..3) for a mode. */
  getCurrentEnergyLevel(mode: EnergyMode = "sts"): EnergyLevel {
    return this._levels[mode];
  }

  /** Get the current model name for the mode and active level, or null if exhausted. */
  getCurrentModel(mode: EnergyMode = "sts"): string | null {
    return this.getModelForLevel(this._levels[mode], mode);
  }

  /** Get the model name for a specific level and mode. */
  getModelForLevel(
    level: EnergyLevel,
    mode: EnergyMode = "sts",
  ): string | null {
    return mode === "sts"
      ? STS_MODEL_TIER_BY_LEVEL[level]
      : TTS_MODEL_TIER_BY_LEVEL[level];
  }

  /** Decrement level due to rate limit for a specific mode, logging and emitting change events. */
  handleRateLimitError(mode: EnergyMode = "sts"): void {
    const prev = this._levels[mode];
    const next = Math.max(0, prev - 1) as EnergyLevel;
    if (next === prev) return;

    this._levels[mode] = next;
    const detail: EnergyLevelChangedDetail = {
      mode,
      level: this._levels[mode],
      modelTier: this.getCurrentModel(mode),
      prevLevel: prev,
      reason: "rate-limit-exceeded",
    };

    logger.debug("Energy level downgraded", detail);
    this.dispatchEvent(
      new CustomEvent<EnergyLevelChangedDetail>("energy-level-changed", {
        detail,
      }),
    );
  }

  /** Reset the energy level to 3 for a mode and emit a change event. */
  resetEnergyLevel(
    reason: EnergyLevelChangedDetail["reason"] = "session-reset",
    mode: EnergyMode = "sts",
  ): void {
    const prev = this._levels[mode];
    if (prev === 3) return;
    this._levels[mode] = 3;
    const detail: EnergyLevelChangedDetail = {
      mode,
      level: this._levels[mode],
      modelTier: this.getCurrentModel(mode),
      prevLevel: prev,
      reason,
    };
    logger.debug("Energy level reset", detail);
    this.dispatchEvent(
      new CustomEvent<EnergyLevelChangedDetail>("energy-level-changed", {
        detail,
      }),
    );
  }

  /** Set the energy level manually (clamped to 0..3) for a mode. */
  setEnergyLevel(
    level: number,
    reason: EnergyLevelChangedDetail["reason"] = "manual",
    mode: EnergyMode = "sts",
  ): void {
    const clamped = Math.max(0, Math.min(3, Math.floor(level))) as EnergyLevel;
    const prev = this._levels[mode];
    if (clamped === prev) return;

    this._levels[mode] = clamped;
    const detail: EnergyLevelChangedDetail = {
      mode,
      level: this._levels[mode],
      modelTier: this.getCurrentModel(mode),
      prevLevel: prev,
      reason,
    };

    logger.warn("Energy level changed manually", detail);
    this.dispatchEvent(
      new CustomEvent<EnergyLevelChangedDetail>("energy-level-changed", {
        detail,
      }),
    );
  }
}

export const energyBarService = EnergyBarService.instance;
