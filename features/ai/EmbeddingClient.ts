export interface EmbeddingClient {
  models: {
    /**
     * Generate embeddings for the given content
     * @param request The embedding request containing the content to embed
     * @returns The embedding response
     */
    embedContent: (request: EmbeddingRequest) => Promise<EmbeddingResponse>
  }
}

export interface EmbeddingRequest {
  model: string
  contents: string | string[]
  taskType?: string // e.g., 'SEMANTIC_SIMILARITY', 'RETRIEVAL_QUERY', 'RETRIEVAL_DOCUMENT'
  outputDimensionality?: number // e.g., 768, 1536, 3072
  title?: string // Optional title for the content
}

export interface Embedding {
  values: number[]
  statistics?: {
    tokenCount: number
  }
}

export interface EmbeddingResponse {
  embedding?: Embedding
  embeddings: Embedding[]
}

/**
 * Type guard to check if a client supports embeddings
 */
export function isEmbeddingClient(client: unknown): client is EmbeddingClient {
  return (
    typeof (client as { models?: { embedContent?: unknown } })?.models
      ?.embedContent === 'function'
  )
}
