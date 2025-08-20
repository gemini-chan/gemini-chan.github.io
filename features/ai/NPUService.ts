import { createComponentLogger } from "@services/DebugLogger";
import type { AIClient } from "./BaseAIService";
import { isEmbeddingClient } from "./EmbeddingClient";
import type { Memory } from "@features/memory/Memory";
import { MemoryService } from "@features/memory/MemoryService";

const logger = createComponentLogger("NPUService");

export interface RAGPrompt {
  enhancedPrompt: string;
  retrievedMemories: Memory[];
  memoryContext: string;
}

export class NPUService {
  constructor(
    private aiClient: AIClient,
    private memoryService: MemoryService,
  ) {}

  /**
   * Creates an RAG-augmented prompt by retrieving relevant memories and formulating
   * an enhanced prompt for the VPU (conversational model).
   */
  async createRAGPrompt(
    userMessage: string,
    personaId: string,
    conversationContext?: string,
  ): Promise<RAGPrompt> {
    try {
      // Step 1: Retrieve relevant memories for the user's message
      const retrievedMemories = await this.memoryService.retrieveRelevantMemories(
        userMessage,
        personaId,
        5, // Get top 5 relevant memories
      );

      logger.debug("Retrieved memories for RAG prompt", {
        userMessage,
        memoryCount: retrievedMemories.length,
        personaId,
      });

      // Step 2: Format memories into context string
      const memoryContext = this.formatMemoriesForContext(retrievedMemories);

      // Step 3: Create enhanced prompt using NPU (gemini-2.5-flash)
      const enhancedPrompt = await this.formulateEnhancedPrompt(
        userMessage,
        memoryContext,
        conversationContext,
      );

      return {
        enhancedPrompt,
        retrievedMemories,
        memoryContext,
      };
    } catch (error) {
      logger.error("Failed to create RAG prompt", { error, userMessage, personaId });

      // Return original message if RAG fails
      return {
        enhancedPrompt: userMessage,
        retrievedMemories: [],
        memoryContext: "",
      };
    }
  }

  /**
   * Formats retrieved memories into a clean context string for the prompt.
   */
  private formatMemoriesForContext(memories: Memory[]): string {
    if (memories.length === 0) {
      return "";
    }

    const memoryStrings = memories.map((memory, index) => {
      return `[${index + 1}] ${memory.fact_value}`;
    });

    return memoryStrings.join("\n");
  }

  /**
   * Creates an enhanced prompt by combining the user's original message with memory context.
   * Preserves the original message exactly while adding relevant context.
   */
  private async formulateEnhancedPrompt(
    userMessage: string,
    memoryContext: string,
    conversationContext?: string,
  ): Promise<string> {
    // If no memory context, return original message as-is
    if (!memoryContext.trim()) {
      return userMessage;
    }

    // Create enhanced prompt that preserves original message
    let enhancedPrompt = `USER'S MESSAGE: ${userMessage}\n\n`;

    if (memoryContext) {
      enhancedPrompt += `RELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS:\n${memoryContext}\n\n`;
    }

    enhancedPrompt += `INSTRUCTIONS FOR AI:
- Respond to the user's message above
- Use the context provided to make your response more relevant and personalized
- Keep your response natural and conversational
- Do NOT explicitly mention "memories" or "context" in your response
- If the context is relevant, weave it naturally into your response`;

    logger.debug("Created enhanced prompt preserving original message", {
      originalMessage: userMessage,
      hasMemoryContext: !!memoryContext.trim(),
      enhancedPromptLength: enhancedPrompt.length,
    });

    return enhancedPrompt;
  }

}