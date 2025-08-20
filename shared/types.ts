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
