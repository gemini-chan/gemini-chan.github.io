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
      const responseText = await this.callAIModel(prompt);

      // Parse and validate the response
      const facts = this.parseExtractionResponse(responseText);
      return facts;
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
      // In a real implementation, we would load the prompt from the file system
      // For now, we'll return a simplified prompt
      return `You are a fact extraction expert. Your task is to analyze conversation transcripts and identify important, foundational pieces of information that should be remembered.
      
Instructions:
1. Analyze the conversation and extract key facts about the user
2. Return ONLY a JSON array with the extracted facts
3. Each fact should have the following structure:
{
  "fact_key": "descriptive_key_name",
  "fact_value": "the actual fact",
  "confidence_score": 0.0-1.0,
  "permanence_score": "permanent|temporary|contextual"
}

Conversation to analyze:
${transcript}`;
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
    responseText: string,
  ): Omit<Memory, "personaId" | "timestamp" | "conversation_turn">[] {
    try {
      // Try to parse the response as JSON
      const facts =
        this.parseJsonResponse<
          Omit<Memory, "personaId" | "timestamp" | "conversation_turn">[]
        >(responseText);

      if (facts && Array.isArray(facts)) {
        return facts.filter(
          (fact) =>
            fact.fact_key &&
            fact.fact_value &&
            typeof fact.confidence_score === "number" &&
            ["permanent", "temporary", "contextual"].includes(
              fact.permanence_score,
            ),
        );
      }

      logger.warn("Invalid response format from AI model", { responseText });
      return [];
    } catch (error) {
      logger.error("Failed to parse extraction response", {
        error,
        responseText,
      });
      return [];
    }
  }

  /**
   * Retrieve relevant memories for a given query using semantic search
   * @param query The search query to find relevant memories for
   * @param sessionId The user session ID
   * @param topK The number of top memories to retrieve (default: 5)
   * @returns Array of relevant Memory objects
   */
  async retrieveRelevantMemories(
    query: string,
    sessionId: string,
    topK: number = 5,
  ): Promise<Memory[]> {
    try {
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

      logger.debug("Retrieved memories", {
        query,
        sessionId,
        memoryCount: limitedMemories.length,
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
}
