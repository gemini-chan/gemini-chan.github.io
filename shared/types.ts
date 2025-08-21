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