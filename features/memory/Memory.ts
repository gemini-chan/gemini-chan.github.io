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
  // Artificial Emotional Intelligence (AEI) enrichment
  emotional_flavor?: string; // e.g., joy, sadness, anger, calm, anxious
  emotion_confidence?: number; // 0..1
  // Optional similarity score returned from vector search
  similarity?: number;
}
