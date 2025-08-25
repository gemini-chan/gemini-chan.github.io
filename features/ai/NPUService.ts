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
    logger.debug("analyzeAndAdvise: memories retrieved", { count: memories.length });
    
    // Build combined prompt for Flash Lite model
    const combinedPromptText = this.buildCombinedPrompt(userInput, "", conversationContext);
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

    // The VPU will handle the raw response appropriately
    const payload: IntentionBridgePayload = {
      emotion: "neutral", // VPU will handle actual emotional state from Flash Lite response
      rag_prompt_for_vpu: userInput, // Pass original user input, VPU will handle context
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
 
 }
