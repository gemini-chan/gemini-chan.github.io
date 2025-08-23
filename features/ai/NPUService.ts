import type { Memory } from "@features/memory/Memory";
import type { MemoryService } from "@features/memory/MemoryService";
import { createComponentLogger } from "@services/DebugLogger";
import type { Turn } from "@shared/types";
import type { AIClient } from "./BaseAIService";

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
      const retrievedMemories =
        await this.memoryService.retrieveRelevantMemories(
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

      // Step 3: Synchronously formulate the enhanced prompt
      const enhancedPrompt = this.formulateEnhancedPrompt(
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
      logger.error("Failed to create RAG prompt", {
        error,
        userMessage,
        personaId,
      });

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
  private formulateEnhancedPrompt(
    userMessage: string,
    memoryContext: string,
    conversationContext?: string,
  ): string {
    // If no memory context, return original message as-is
    if (!memoryContext.trim() && !conversationContext?.trim()) {
      return userMessage;
    }

    // Create enhanced prompt that preserves original message
    let enhancedPrompt = `USER'S MESSAGE: ${userMessage}\n\n`;

    if (conversationContext?.trim()) {
      enhancedPrompt += `CURRENT CONVERSATION CONTEXT:\n${conversationContext}\n\n`;
    }

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
      hasConversationContext: !!conversationContext?.trim(),
      enhancedPromptLength: enhancedPrompt.length,
    });

    return enhancedPrompt;
  }

  /**
   * Analyzes the emotional tone of a conversation transcript.
   * This is a core NPU cognitive task.
   */
  async analyzeEmotion(transcript: Turn[]): Promise<string> {
    if (!transcript || transcript.length === 0) {
      return "neutral";
    }

    try {
      const prompt = this.createEmotionPrompt(transcript);
      // Use the main NPU model for this cognitive task
      const result = await this.aiClient.models.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        model: "gemini-2.5-flash",
      });
      const text = result.text;
      return text.toLowerCase().trim();
    } catch (error) {
      logger.error("Error analyzing emotion:", { error });
      return "neutral"; // Fallback to neutral on error
    }
  }

  private createEmotionPrompt(transcript: Turn[]): string {
    const conversation = transcript
      .map((turn) => `${turn.speaker}: ${turn.text}`)
      .join("\n");
    return `Analyze the overall emotion of the following conversation. Respond with a single word, such as: joy, sadness, anger, surprise, fear, or neutral.\n\n${conversation}`;
  }
}
