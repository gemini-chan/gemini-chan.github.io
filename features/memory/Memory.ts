export interface Memory {
  id?: number;
  fact_key: string;
  fact_value: string;
  confidence_score: number;
  permanence_score: "permanent" | "temporary" | "contextual";
  timestamp: Date;
  conversation_turn: string;
  reinforcement_count?: number;
  last_accessed_timestamp?: Date;
  personaId: string;
  vector?: number[]; // Will be populated when stored in VectorStore
}
