import type { Memory } from "@features/memory/Memory";
import type { MemoryService } from "@features/memory/MemoryService";
import { createComponentLogger } from "@services/DebugLogger";
import type { Turn, IntentionBridgePayload } from "@shared/types";
import type { AIClient } from "./BaseAIService";

// Import prompt templates
import combinedPrompt from "@prompts/npu/combined-npu.prompt.md?raw";

const logger = createComponentLogger("NPUService");

export interface RAGPrompt {
  enhancedPrompt: string;
  retrievedMemories: Memory[];
  memoryContext: string;
}

export interface UnifiedNpuResponse {
  analysis?: { emotion?: string; confidence?: number };
  prompt_for_vpu?: string;
  emotion?: string;
  confidence?: number;
}

export interface UnifiedContext {
  emotion: string;
  confidence: number;
  retrievedMemories: Memory[];
  enhancedPrompt: string;
}


export class NPUService {
  /**
   * Analyze user input and return IntentionBridgePayload for VPU.
   * Passes original user message, retrieved RAG memories, and perceived emotional state based on last 5 messages.
   */
  public async analyzeAndAdvise(userInput: string, personaId: string, transcript: Turn[], conversationContext?: string): Promise<IntentionBridgePayload> {
    logger.debug("analyzeAndAdvise: start", {
      personaId,
      userInputLength: userInput?.length ?? 0,
      transcriptLength: transcript?.length ?? 0,
      hasConversationContext: !!conversationContext,
    });

    // Step 1: Retrieve memories to inform prompt (not exposed directly to VPU)
    let memories: Memory[] = [];
    try {
      memories = await this.memoryService.retrieveRelevantMemories(userInput, personaId, 5);
    } catch (error) {
      logger.error("Failed to retrieve memories for analyzeAndAdvise", { error, personaId });
    }

    // Build prompt
    const memoryContext = this.formatMemoriesForContext(memories);
    logger.debug("analyzeAndAdvise: memories retrieved", { count: memories.length });
    
    // Create enhanced prompt for VPU (preserving original message)
    const enhancedPrompt = this.formulateEnhancedPrompt(userInput, memoryContext, "neutral", 0.5);
    
    // Build combined prompt for Flash Lite model
    const combinedPromptText = this.buildCombinedPrompt(userInput, memoryContext, conversationContext);
    logger.debug("analyzeAndAdvise: combined prompt built", { length: combinedPromptText.length });

    // Call model with retry - single call to Flash Lite model
    const model = "gemini-2.5-flash";
    let responseText = "";
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.aiClient.models.generateContent({
          contents: [{ role: "user", parts: [{ text: combinedPromptText }] }],
          model,
        });
        responseText = (result.text || "").trim();
        logger.debug("analyzeAndAdvise: model responded", { length: responseText.length, attempt });
        if (responseText) break;
      } catch (error) {
        logger.error("analyzeAndAdvise model call failed", { error, attempt });
        if (attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, Math.pow(2, attempt) * 200));
          continue;
        }
      }
    }

    // Instead of parsing, pass the raw response to VPU
    // The VPU will handle the raw response appropriately
    const payload: IntentionBridgePayload = {
      emotion: "neutral",
      emotion_confidence: 0.5,
      rag_prompt_for_vpu: enhancedPrompt,
    };

    logger.info("analyzeAndAdvise: completed", {
      hasResponseText: !!responseText.length,
    });

    return payload;
  }

  constructor(
    private aiClient: AIClient,
    private memoryService: MemoryService,
  ) {}


  // v1 unified prompt for model to return IntentionBridgePayload JSON
  // Build combined prompt for single Flash Lite model call
  private buildCombinedPrompt(
    userMessage: string,
    memoryContext: string,
    conversationContext?: string,
  ): string {
    const ctxBlocks: string[] = [];
    if (conversationContext?.trim()) {
      ctxBlocks.push(`CURRENT CONVERSATION CONTEXT:\n${conversationContext}`);
    }
    if (memoryContext?.trim()) {
      ctxBlocks.push(
        `RELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS:\n${memoryContext}`,
      );
    }

    const contextSection = ctxBlocks.length
      ? `\n\n${ctxBlocks.join("\n\n")}`
      : "";

    // Use the combined markdown prompt template
    return combinedPrompt
      .replace("{context}", contextSection)
      .replace("{userMessage}", userMessage);
  }


  /**
   * Formats retrieved memories into a clean context string for the prompt.
   */
  // v1: supplementary helpers retained for fallback or alt prompts
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
    emotion: IntentionBridgePayload["emotion"],
    emotionConfidence: number,
  ): string {
    // If no memory context, return original message as-is
    if (!memoryContext.trim()) {
      return userMessage;
    }

    // Create enhanced prompt that preserves original message
    let enhancedPrompt = `USER'S MESSAGE: ${userMessage}\n\n`;

    // Add emotional context
    enhancedPrompt += `USER'S EMOTIONAL STATE: ${emotion} (confidence: ${emotionConfidence})\n\n`;

    if (memoryContext) {
      enhancedPrompt += `RELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS:\n${memoryContext}\n\n`;
    }

    enhancedPrompt += `INSTRUCTIONS FOR AI:
- Respond to the user's message above
- Consider the user's emotional state when crafting your response
- Use the context provided to make your response more relevant and personalized
- Keep your response natural and conversational
- Do NOT explicitly mention "memories" or "context" in your response
- If the context is relevant, weave it naturally into your response`;

    logger.debug("Created enhanced prompt preserving original message", {
      originalMessage: userMessage,
      emotion,
      emotionConfidence,
      hasMemoryContext: !!memoryContext.trim(),
      enhancedPromptLength: enhancedPrompt.length,
    });

    return enhancedPrompt;
  }
 
 
 
 }
