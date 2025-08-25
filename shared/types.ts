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
  /** The user's verbatim input, to be used as the prompt for the VPU's RAG response. */
  rag_prompt_for_vpu: string;
}
