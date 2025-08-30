export interface Turn {
  speaker: "user" | "model";
  text: string;
  isSystemMessage?: boolean;
  timestamp?: Date;
  turnId?: string;
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
  /**
   * Advisor context prepared by the NPU (plain text), containing perceived user/model emotional states
   * and conversationally formatted relevant context (RAG facts), without re-emitting the user's message.
   * This will be prefixed before the raw user message for VPU.
   */
  advisor_context: string;
}
