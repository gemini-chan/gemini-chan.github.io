import { createComponentLogger } from "./debug-logger";

export type EnergyLevel = 0 | 1 | 2 | 3;

export interface EnergyState {
  level: EnergyLevel;
  modelTier: string | null;
}

export interface EnergyLevelChangedDetail extends EnergyState {
  reason: "rate-limit-exceeded" | "session-reset" | "manual";
  prevLevel: EnergyLevel;
}

const logger = createComponentLogger("energy-bar-system");

// Mapping based on design spec
const MODEL_TIER_BY_LEVEL: Record<EnergyLevel, string | null> = {
  3: "gemini-2.5-flash-exp-native-audio-thinking-dialog",
  2: "gemini-2.5-flash-preview-native-audio-dialog",
  1: "gemini-2.5-flash-live-preview",
  0: null,
};

/**
 * Singleton service managing the Energy Bar state and model tier mapping.
 * Emits `energy-level-changed` CustomEvent<EnergyLevelChangedDetail> on changes.
 */
export class EnergyBarService extends EventTarget {
  private static _instance: EnergyBarService | null = null;
  private _level: EnergyLevel = 3;

  static get instance(): EnergyBarService {
    if (!EnergyBarService._instance)
      EnergyBarService._instance = new EnergyBarService();
    return EnergyBarService._instance;
  }

  /** Get the current energy level (0..3). */
  getCurrentEnergyLevel(): EnergyLevel {
    return this._level;
  }

  /** Get the current model name for the active level, or null if exhausted. */
  getCurrentModel(): string | null {
    return MODEL_TIER_BY_LEVEL[this._level];
  }

  /** Get the model name for a specific level. */
  getModelForLevel(level: EnergyLevel): string | null {
    return MODEL_TIER_BY_LEVEL[level];
  }

  /** Decrement level due to rate limit, logging and emitting change events. */
  handleRateLimitError(): void {
    const prev = this._level;
    const next = Math.max(0, prev - 1) as EnergyLevel;
    if (next === prev) return;

    this._level = next;
    const detail: EnergyLevelChangedDetail = {
      level: this._level,
      modelTier: this.getCurrentModel(),
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

  /** Reset the energy level to 3 and emit a change event. */
  resetEnergyLevel(
    reason: EnergyLevelChangedDetail["reason"] = "session-reset",
  ): void {
    const prev = this._level;
    if (prev === 3) return;
    this._level = 3;
    const detail: EnergyLevelChangedDetail = {
      level: this._level,
      modelTier: this.getCurrentModel(),
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

  /** Set the energy level manually (clamped to 0..3). */
  setEnergyLevel(
    level: number,
    reason: EnergyLevelChangedDetail["reason"] = "manual",
  ): void {
    const clamped = Math.max(0, Math.min(3, Math.floor(level))) as EnergyLevel;
    const prev = this._level;
    if (clamped === prev) return;

    this._level = clamped;
    const detail: EnergyLevelChangedDetail = {
      level: this._level,
      modelTier: this.getCurrentModel(),
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
