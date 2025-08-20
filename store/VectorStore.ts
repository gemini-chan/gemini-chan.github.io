import type { AIClient } from "@features/ai/BaseAIService";
import { isEmbeddingClient } from "@features/ai/EmbeddingClient";
import type { Memory } from "@features/memory/Memory";
import { createComponentLogger } from "@services/DebugLogger";
import { type IDBPDatabase, openDB } from "idb";

const logger = createComponentLogger("VectorStore");

const DB_NAME = "vtuber-memory";
const DB_VERSION = 1;
const STORE_NAME_PREFIX = "persona-memory-";

export class VectorStore {
  private personaId: string;
  private db: IDBPDatabase | null = null;
  private aiClient: AIClient | null = null;
  private embeddingModel: string = "gemini-embedding-001";

  constructor(
    personaId: string,
    aiClient?: AIClient,
    embeddingModel: string = "gemini-embedding-001",
  ) {
    this.personaId = personaId;
    this.aiClient = aiClient || null;
    this.embeddingModel = embeddingModel;
  }

  private getStoreName(): string {
    return `${STORE_NAME_PREFIX}${this.personaId}`;
  }

  async init(): Promise<void> {
    const storeName = this.getStoreName();
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      },
    });
  }

  async switchPersona(newPersonaId: string): Promise<void> {
    this.personaId = newPersonaId;
    // No need to close the current DB connection, just ensure the new store exists.
    await this.init();
  }

  /**
   * Set the AI client for embedding generation
   * @param client The AI client that supports embeddings
   * @param embeddingModel The embedding model to use
   */
  setAIClient(
    client: AIClient,
    embeddingModel: string = "gemini-embedding-001",
  ): void {
    this.aiClient = client;
    this.embeddingModel = embeddingModel;
  }

  /**
   * Save a memory entry to the vector store
   * @param memory The memory object to save
   */
  async saveMemory(memory: Omit<Memory, "vector">): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    try {
      // Generate embedding for the memory content
      const contentToEmbed = `${memory.fact_key}: ${memory.fact_value}`;
      const vector = this.aiClient
        ? await this.generateEmbedding(contentToEmbed)
        : new Array(768).fill(0); // Fallback to zero vector

      const memoryWithVector: Memory = {
        ...memory,
        vector: vector,
      };

      const storeName = this.getStoreName();
      const tx = this.db!.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);

      // Check for duplicates based on fact_key and fact_value
      const existingMemories = await store.getAll();
      const duplicate = existingMemories.find(
        (m: Memory) =>
          m.fact_key === memory.fact_key && m.fact_value === memory.fact_value,
      );

      if (duplicate) {
        // Update existing memory (reinforcement)
        duplicate.reinforcement_count =
          (duplicate.reinforcement_count || 0) + 1;
        duplicate.last_accessed_timestamp = new Date();
        duplicate.vector = vector; // Update vector as well
        await store.put(duplicate);
        logger.debug("Updated existing memory", {
          factKey: memory.fact_key,
          reinforcementCount: duplicate.reinforcement_count,
        });
      } else {
        // Save new memory
        await store.add(memoryWithVector);
        logger.debug("Saved new memory", { factKey: memory.fact_key });
      }

      await tx.done;
    } catch (error) {
      logger.error("Failed to save memory", { error, memory });
      throw error;
    }
  }

  /**
   * Generate embedding for the given text using the AI client
   * @param text The text to embed
   * @returns The embedding vector
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.aiClient) {
      logger.warn(
        "No AI client available for embedding generation, returning zero vector",
      );
      return new Array(768).fill(0);
    }

    // Check if the client supports embeddings
    if (!isEmbeddingClient(this.aiClient)) {
      logger.warn(
        "AI client does not support embeddings, returning zero vector",
      );
      return new Array(768).fill(0);
    }

    try {
      const request = {
        model: this.embeddingModel,
        content: text,
        taskType: "SEMANTIC_SIMILARITY",
        outputDimensionality: 768,
      };

      const response = await this.aiClient.models.embedContent(request);
      return response.embedding.values;
    } catch (error) {
      logger.error("Failed to generate embedding", {
        error,
        textLength: text.length,
      });
      // Return zero vector as fallback
      return new Array(768).fill(0);
    }
  }

  /**
   * Retrieve all memories for the current persona
   * @returns Array of memory objects
   */
  async getAllMemories(): Promise<Memory[]> {
    if (!this.db) {
      await this.init();
    }

    const storeName = this.getStoreName();
    const tx = this.db!.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const memories = await store.getAll();
    await tx.done;

    return memories;
  }

  /**
   * Search for similar memories based on content using vector similarity
   * @param query The search query
   * @param threshold Similarity threshold (0-1)
   * @returns Array of similar memories
   */
  async searchMemories(
    query: string,
    threshold: number = 0.8,
  ): Promise<Memory[]> {
    if (!this.db) {
      await this.init();
    }

    try {
      // Generate embedding for the query
      const queryVector = await this.generateEmbedding(query);

      const storeName = this.getStoreName();
      const tx = this.db!.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const allMemories = await store.getAll();
      await tx.done;

      // Calculate cosine similarity for each memory
      const memoriesWithSimilarity = allMemories.map((memory) => {
        if (!memory.vector) {
          return { ...memory, similarity: 0 };
        }

        const similarity = this.cosineSimilarity(queryVector, memory.vector);
        return { ...memory, similarity };
      });

      // Filter by threshold and sort by similarity
      return memoriesWithSimilarity
        .filter((memory) => memory.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      logger.error("Failed to search memories", { error, query, threshold });
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param vecA First vector
   * @param vecB Second vector
   * @returns Cosine similarity score (0-1)
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      logger.warn("Vectors have different lengths", {
        lenA: vecA.length,
        lenB: vecB.length,
      });
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
}
