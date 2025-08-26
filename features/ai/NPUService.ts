import type { Memory } from "@features/memory/Memory";
import type { MemoryService } from "@features/memory/MemoryService";
import { createComponentLogger } from "@services/DebugLogger";
import { healthMetricsService } from "@services/HealthMetricsService";
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
  user_emotion?: { label?: string; confidence?: number };
  model_emotion?: { label?: string; confidence?: number };
  advisor_context?: string;
}

export class NPUService {
  private lastCombinedPrompt: string | null = null;
  /**
   * Analyze user input and return IntentionBridgePayload for VPU.
   * Passes original user message, retrieved RAG memories, and perceived emotional state based on last 5 messages.
   */
  public async analyzeAndAdvise(userInput: string, personaId: string, transcript: Turn[], conversationContext?: string, emotionBias?: string): Promise<IntentionBridgePayload> {
    const stopTimer = healthMetricsService.timeNPUProcessing();
    
    logger.debug("analyzeAndAdvise: start", {
      personaId,
      userInputLength: userInput?.length ?? 0,
      transcriptLength: transcript?.length ?? 0,
      hasConversationContext: !!conversationContext,
    });

    // Step 1: Retrieve memories to inform prompt (not exposed directly to VPU)
    let memories: Memory[] = [];
    try {
      memories = await this.memoryService.retrieveRelevantMemories(userInput, personaId, 5, { emotionBias });
    } catch (error) {
      logger.error("Failed to retrieve memories for analyzeAndAdvise", { error, personaId });
    }

    // Build prompt
    logger.debug("analyzeAndAdvise: memories retrieved", { count: memories.length });
    
    // Build memory context string from retrieved memories
    const memoryContext = memories
      .map(m => `- ${m.fact_key}: ${m.fact_value} (conf=${(m.confidence_score ?? 0).toFixed(2)}, perm=${m.permanence_score})`)
      .join("\n");

    // Build combined prompt for Flash Lite model
    const combinedPromptText = this.buildCombinedPrompt(userInput, memoryContext, conversationContext);
    logger.debug("analyzeAndAdvise: combined prompt built", { length: combinedPromptText.length, memoryLines: memories.length });

    // Save for MPU (MemoryService) AEI use
    this.lastCombinedPrompt = combinedPromptText;

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

    // Parse the plain text response
    const parsedResponse = this.parseNpuResponse(responseText, memoryContext);
    
    const advisorContext = parsedResponse.advisor_context || memoryContext || "";
    
    const payload: IntentionBridgePayload = {
      advisor_context: advisorContext,
    };

    // Save for MPU (MemoryService) AEI use
    this.lastCombinedPrompt = advisorContext;

    logger.info("analyzeAndAdvise: completed", {
      hasResponseText: !!responseText.length,
    });

    stopTimer();
    return payload;
  }

  constructor(
    private aiClient: AIClient,
    private memoryService: MemoryService,
  ) {}

  /**
   * Provide the last combined prompt that the NPU built, for AEI enrichment downstream.
   * This is optional and should be used only to enrich memory extraction with perceived context.
   */
  public getLastCombinedPrompt(): string | null {
    return this.lastCombinedPrompt;
  }

  // Build combined prompt for single Flash Lite model call
  // IMPORTANT: The NPU is an advisor (cortex) — it must not instruct the VPU (actor) how to speak.
  // The combined prompt should focus on analysis, salient facts, and relevant context only.
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
   * Parse the plain text response from the NPU model.
   * @param responseText The raw response from the model
   * @param fallbackContext The fallback context if parsing fails
   * @returns Parsed response with user emotion, model emotion, and advisor context
   */
  private parseNpuResponse(responseText: string, fallbackContext: string): UnifiedNpuResponse {
    // If response is empty, return fallback
    if (!responseText?.trim()) {
      return {
        user_emotion: { label: "neutral", confidence: 0.5 },
        model_emotion: { label: "neutral", confidence: 0.5 },
        advisor_context: fallbackContext,
      };
    }

    try {
      // Parse the plain text response
      const lines = responseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Initialize default values
      let userEmotion: { label?: string; confidence?: number } = { label: "neutral", confidence: 0.5 };
      let modelEmotion: { label?: string; confidence?: number } = { label: "neutral", confidence: 0.5 };
      let advisorContext = "";
      
      // Parse USER_EMOTION line
      const userEmotionLine = lines.find(line => line.startsWith("USER_EMOTION:"));
      if (userEmotionLine) {
        const userEmotionMatch = userEmotionLine.match(/USER_EMOTION:\s*(\w+)\s*\(confidence=([0-9.]+)\)/);
        if (userEmotionMatch) {
          userEmotion = {
            label: userEmotionMatch[1],
            confidence: parseFloat(userEmotionMatch[2])
          };
        }
      }
      
      // Parse MODEL_EMOTION line
      const modelEmotionLine = lines.find(line => line.startsWith("MODEL_EMOTION:"));
      if (modelEmotionLine) {
        const modelEmotionMatch = modelEmotionLine.match(/MODEL_EMOTION:\s*(\w+)\s*\(confidence=([0-9.]+)\)/);
        if (modelEmotionMatch) {
          modelEmotion = {
            label: modelEmotionMatch[1],
            confidence: parseFloat(modelEmotionMatch[2])
          };
        }
      }
      
      // Parse ADVISOR_CONTEXT section
      const advisorContextStartIndex = lines.findIndex(line => line.startsWith("ADVISOR_CONTEXT:"));
      if (advisorContextStartIndex !== -1) {
        // Get all lines after ADVISOR_CONTEXT until we hit another section or end
        const advisorLines = lines.slice(advisorContextStartIndex + 1);
        // Filter out empty lines and lines that look like new sections
        const contextLines = advisorLines.filter(line =>
          line.startsWith("•") ||
          (!line.includes(":") && !line.startsWith("USER_EMOTION:") && !line.startsWith("MODEL_EMOTION:"))
        );
        advisorContext = contextLines.join("\n");
      }
      
      // If no advisor context was parsed, use fallback
      if (!advisorContext.trim()) {
        advisorContext = fallbackContext;
      }
      
      return {
        user_emotion: userEmotion,
        model_emotion: modelEmotion,
        advisor_context: advisorContext,
      };
    } catch (error) {
      logger.error("Failed to parse NPU response, using fallback", { error, responseText });
      // On parse failure, fall back to defaults
      return {
        user_emotion: { label: "neutral", confidence: 0.5 },
        model_emotion: { label: "neutral", confidence: 0.5 },
        advisor_context: fallbackContext,
      };
    }
  }
 }
