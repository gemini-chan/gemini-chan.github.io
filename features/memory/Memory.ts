export interface Memory {
  id?: number
  fact_key: string
  fact_value: string
  confidence_score: number
  permanence_score: 'permanent' | 'temporary' | 'contextual'
  timestamp: Date
  conversation_turn: string
  reinforcement_count?: number
  last_accessed_timestamp?: Date
  personaId: string
  vector?: number[] // Will be populated when stored in VectorStore
  // Artificial Emotional Intelligence (AEI) enrichment
  emotional_flavor?: string // e.g., joy, sadness, anger, calm, anxious
  emotion_confidence?: number // 0..1
  // Emotional context from NPU
  user_emotion?: string // The user's emotional state when this memory was created
  model_emotion?: string // The model's emotional state when this memory was created
  // Source tracking to prevent confusion between user and model memories
  source?: 'user' | 'model' | 'interaction' // Whether this fact is about the user, model, or the interaction
  // Optional similarity score returned from vector search
  similarity?: number
}
