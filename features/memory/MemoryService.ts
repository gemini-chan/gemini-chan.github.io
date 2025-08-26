import { type AIClient, BaseAIService } from "@features/ai/BaseAIService";
import { createComponentLogger } from "@services/DebugLogger";
import type { VectorStore } from "@store/VectorStore";
import type { Memory } from "./Memory";

const logger = createComponentLogger("MemoryService");
const MODEL_NAME = "gemini-2.5-flash-lite";

export interface IMemoryService {
  processAndStoreMemory(transcript: string, sessionId: string): Promise<void>;
  retrieveRelevantMemories(
    query: string,
    sessionId: string,
    topK?: number,
  ): Promise<Memory[]>;
  getAllMemories(): Promise<Memory[]>;
  deleteMemory(memoryId: number): Promise<void>;
  deleteAllMemories(): Promise<void>;
  extractAndStoreFacts(turns: string, sessionId: string): Promise<void>; // New method
}

export class MemoryService extends BaseAIService implements IMemoryService {
  private vectorStore: VectorStore;

  constructor(vectorStore: VectorStore, client: AIClient) {
    super(client, MODEL_NAME);
    this.vectorStore = vectorStore;
  }

  /**
   * Process conversation transcript and store key facts in the vector store
   * @param transcript The conversation transcript to process
   * @param sessionId The user session ID
   */
  async processAndStoreMemory(
    conversationContext: string,
    sessionId: string,
  ): Promise<void> {
    try {
      logger.debug("Processing memory for session", {
        sessionId,
        contextLength: conversationContext.length,
      });

      // Store the conversation context as it appears in the UI
      // This provides better context for future conversations
      if (conversationContext.trim()) {
        await this.vectorStore.saveMemory({
          fact_key: `conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fact_value: conversationContext.trim(),
          confidence_score: 0.8, // Default confidence score
          permanence_score: "contextual", // Default permanence score
          personaId: sessionId,
          timestamp: new Date(),
          conversation_turn: conversationContext.trim(),
        });
      }

      logger.info("Memory processing completed for session", {
        sessionId,
      });
    } catch (error) {
      logger.error("Failed to process and store memory", { error, sessionId });
      // Gracefully handle errors without crashing the main application
    }
  }

  /**
   * Extract facts from a conversation turn and store them
   * @param turns The conversation turns to process
   * @param sessionId The user session ID
   */
  async extractAndStoreFacts(
    turns: string,
    sessionId: string,
  ): Promise<void> {
    try {
      logger.debug("Extracting facts from turns", {
        sessionId,
        turnsLength: turns.length,
      });

      // Use Flash Lite to extract facts
      const prompt = `Extract key facts from the following conversation turn. Return a JSON array of facts with keys "fact_key", "fact_value", "confidence_score", and "permanence_score".
Examples of facts:
- "user_name": "Alex"
- "user_occupation": "software developer"
- "user_emotional_state": "nervous"
- "user_current_mood": "tired"

Conversation turn:
${turns}

JSON array of facts:`;

      const response = await this.callAIModel(prompt);
      let facts;
      try {
        facts = JSON.parse(response);
      } catch (parseError) {
        logger.error("Failed to parse facts from Flash Lite response", { parseError, response });
        return;
      }

      // Store each fact
      for (const fact of facts) {
        await this.vectorStore.saveMemory({
          fact_key: fact.fact_key,
          fact_value: fact.fact_value,
          confidence_score: fact.confidence_score,
          permanence_score: fact.permanence_score,
          personaId: sessionId,
          timestamp: new Date(),
          conversation_turn: turns,
        });
      }

      logger.info("Fact extraction and storage completed for session", {
        sessionId,
        factCount: facts.length,
      });
    } catch (error) {
      logger.error("Failed to extract and store facts", { error, sessionId });
    }
  }

  /**
   * Retrieve relevant memories for a given query using semantic search
   * @param query The search query to find relevant memories for
   * @param sessionId The user session ID
   * @param topK The number of top memories to retrieve (default: 5)
   * @returns Array of relevant Memory objects
   */
  // Cache for memory search results to improve performance
  private searchCache = new Map<
    string,
    { result: Memory[]; timestamp: number }
  >();
  private readonly CACHE_TTL = 30000; // 30 seconds

  async retrieveRelevantMemories(
    query: string,
    sessionId: string,
    topK: number = 5,
  ): Promise<Memory[]> {
    try {
      // Check cache first
      const cacheKey = `${sessionId}:${query.toLowerCase().trim()}`;
      const cached = this.searchCache.get(cacheKey);
      const now = Date.now();

      if (cached && now - cached.timestamp < this.CACHE_TTL) {
        logger.debug("Using cached memory results", { query, sessionId });
        return cached.result.slice(0, topK);
      }

      logger.debug("Retrieving relevant memories", {
        query,
        sessionId,
        topK,
      });

      // Use the vector store to perform semantic search
      // Note: searchMemories uses similarity threshold (0.8 default), not topK
      const relevantMemories = await this.vectorStore.searchMemories(
        query,
        0.7, // Lower threshold to get more results, then we'll limit with slice
      );

      // Limit to topK results
      const limitedMemories = relevantMemories.slice(0, topK);

      // Cache the result
      this.searchCache.set(cacheKey, {
        result: limitedMemories,
        timestamp: now,
      });

      // Clean up old cache entries
      for (const [key, value] of this.searchCache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.searchCache.delete(key);
        }
      }

      logger.debug("Retrieved memories", {
        query,
        sessionId,
        memoryCount: limitedMemories.length,
        cached: false,
      });

      return limitedMemories;
    } catch (error) {
      logger.error("Failed to retrieve relevant memories", {
        error,
        query,
        sessionId,
        topK,
      });
      return []; // Return empty array on failure
    }
  }

  /**
   * Retrieve all memories for the current persona.
   */
  async getAllMemories(): Promise<Memory[]> {
    try {
      logger.debug("Retrieving all memories");
      const memories = await this.vectorStore.getAllMemories();
      logger.debug("Retrieved all memories", { count: memories.length });
      return memories;
    } catch (error) {
      logger.error("Failed to retrieve all memories", { error });
      return [];
    }
  }

  /**
   * Delete a specific memory by its ID.
   * @param memoryId The ID of the memory to delete.
   */
  async deleteMemory(memoryId: number): Promise<void> {
    try {
      logger.debug("Deleting memory", { memoryId });
      await this.vectorStore.deleteMemory(memoryId);
      logger.debug("Deleted memory successfully", { memoryId });
    } catch (error) {
      logger.error("Failed to delete memory", { error, memoryId });
    }
  }

  /**
   * Delete all memories for the current persona.
   */
  async deleteAllMemories(): Promise<void> {
    try {
      logger.debug("Deleting all memories");
      await this.vectorStore.deleteAllMemories();
      logger.debug("Deleted all memories successfully");
    } catch (error) {
      logger.error("Failed to delete all memories", { error });
    }
  }
}
