export interface Turn {
  speaker: "user" | "model";
  text: string;
  isSystemMessage?: boolean;
  timestamp?: Date;
}

export interface CallHistoryItem {
  id: string;
  timestamp: string;
  summary: string;
}

export interface CallSummary {
  id: string;
  timestamp: number;
  summary: string;
  transcript: Turn[];
}

export interface EmotionEvent {
  emotion: string; // e.g., 'joy', 'sadness', 'anger'
  intensity: number; // A value from 0.0 to 1.0
  timestamp: number; // Unix timestamp
}

/**
 * The structured payload returned by the NPU after analyzing user input.
 * This serves as the "Intention Bridge" to the VPU.
 */
export interface IntentionBridgePayload {
  /** The primary emotion detected in the user's input. */
  emotion: "joy" | "sadness" | "anger" | "fear" | "surprise" | "neutral" | "curiosity";
  /** The model's confidence in the detected emotion, from 0.0 to 1.0. */
  emotion_confidence: number;
  /** The final advisory prompt string intended for the VPU to act upon. */
  advisory_prompt_for_vpu: string;
}
