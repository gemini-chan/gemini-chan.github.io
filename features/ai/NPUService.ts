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
   * Uses the NPU to formulate an enhanced prompt that incorporates memory context.
   */
  private async formulateEnhancedPrompt(
    userMessage: string,
    memoryContext: string,
    conversationContext?: string,
  ): Promise<string> {
    const prompt = this.buildNPUPrompt(userMessage, memoryContext, conversationContext);

    try {
      const response = await this.aiClient.models.generateContent({
        model: "gemini-2.5-flash", // NPU model
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const enhancedPrompt = response.text;
      if (!enhancedPrompt) {
        throw new Error("No response from NPU");
      }

      logger.debug("NPU formulated enhanced prompt", {
        originalMessage: userMessage,
        enhancedPrompt: enhancedPrompt.substring(0, 100) + "...",
      });

      return enhancedPrompt;
    } catch (error) {
      logger.error("Failed to formulate enhanced prompt with NPU", { error, userMessage });
      // Return original message if NPU fails
      return userMessage;
    }
  }

  /**
   * Builds the prompt for the NPU to formulate the enhanced prompt.
   */
  private buildNPUPrompt(
    userMessage: string,
    memoryContext: string,
    conversationContext?: string,
  ): string {
    let prompt = `You are the Neural Processing Unit (NPU) for an AI companion system.

Your task is to create an enhanced prompt for the Vocal Processing Unit (VPU) that incorporates relevant memory context.

USER'S CURRENT MESSAGE:
${userMessage}

`;

    if (memoryContext) {
      prompt += `RELEVANT MEMORIES FROM PAST CONVERSATIONS:
${memoryContext}

`;
    }

    if (conversationContext) {
      prompt += `RECENT CONVERSATION CONTEXT:
${conversationContext}

`;
    }

    prompt += `INSTRUCTIONS:
1. Create a natural, conversational prompt that the VPU can use to respond to the user
2. If there are relevant memories, weave them naturally into the prompt without being obvious about it
3. The prompt should help the VPU give a more personalized and context-aware response
4. Do NOT explicitly mention "memories" or "database" in the final prompt
5. If there are no relevant memories, just return the user's original message
6. Keep the enhanced prompt concise but informative

OUTPUT:
Provide only the enhanced prompt that the VPU should use. Do not include any explanations or metadata.`;

    return prompt;
  }
}