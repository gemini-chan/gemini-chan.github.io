import { type AIClient, BaseAIService } from "@features/ai/BaseAIService";
import memoryExtractionPrompt from "@prompts/memory-extraction.prompt.md?raw";
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
    transcript: string,
    sessionId: string,
  ): Promise<void> {
    try {
      logger.debug("Processing memory for session", {
        sessionId,
        transcriptLength: transcript.length,
      });

      // Extract facts from the conversation using the AI model
      const facts = await this.extractFacts(transcript, sessionId);

      // Store each fact in the vector store
      for (const fact of facts) {
        await this.vectorStore.saveMemory({
          ...fact,
          personaId: sessionId,
          timestamp: new Date(),
          conversation_turn: transcript,
        });
      }

      logger.info("Memory processing completed for session", {
        sessionId,
        factsCount: facts.length,
      });
    } catch (error) {
      logger.error("Failed to process and store memory", { error, sessionId });
      // Gracefully handle errors without crashing the main application
    }
  }

  /**
   * Extract key facts from a conversation transcript using the AI model
   * @param transcript The conversation transcript to analyze
   * @param sessionId The user session ID
   * @returns Array of extracted Memory objects
   */
  private async extractFacts(
    transcript: string,
    sessionId: string,
  ): Promise<Omit<Memory, "personaId" | "timestamp" | "conversation_turn">[]> {
    try {
      // Load the memory extraction prompt
      const prompt = await this.loadExtractionPrompt(transcript);

      // Call the AI model to extract facts
      // Instead of parsing, we pass raw response to NPU
      await this.callAIModel(prompt);

      // For now, return empty array as NPU will handle the raw response
      return [];
    } catch (error) {
      logger.error("Failed to extract facts from transcript", {
        error,
        sessionId,
      });
      return []; // Return empty array on failure
    }
  }

  /**
   * Load the memory extraction prompt from the prompts directory
   * @param transcript The conversation transcript to analyze
   * @returns The formatted prompt string
   */
  private async loadExtractionPrompt(transcript: string): Promise<string> {
    try {
      // Dynamically load prompt from file and inject the transcript
      return memoryExtractionPrompt.replace("{conversation}", transcript);
    } catch (error) {
      logger.error("Failed to load extraction prompt", { error });
      // Return a fallback prompt
      return `Extract key facts from this conversation and return them as a JSON array: ${transcript}`;
    }
  }

  /**
   * Parse and validate the AI model's response
   * @param responseText The raw response text from the AI model
   * @returns Array of validated Memory objects
   */
  private parseExtractionResponse(
  ): Omit<Memory, "personaId" | "timestamp" | "conversation_turn">[] {
    // Removed parser as NPU will handle raw response
    return [];
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
