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


export class NPUService {
  private lastCombinedPrompt: string | null = null;
  /**
   * Analyze user input and return IntentionBridgePayload for VPU.
   * Passes original user message, retrieved RAG memories, and perceived emotional state based on last 5 messages.
   */
  public async analyzeAndAdvise(
    userInput: string,
    personaId: string,
    transcript: Turn[],
    conversationContext?: string,
    emotionBias?: string,
    turnId?: string,
    progressCb?: (event: { type: string; ts: number; data?: Record<string, unknown> }) => void,
  ): Promise<IntentionBridgePayload> {
    const stopTimer = healthMetricsService.timeNPUProcessing();
    
    progressCb?.({ type: "npu:start", ts: Date.now(), data: { personaId, userInput, transcriptLength: transcript?.length ?? 0, turnId } });
    logger.debug("analyzeAndAdvise: start", {
      personaId,
      userInputLength: userInput?.length ?? 0,
      transcriptLength: transcript?.length ?? 0,
      hasConversationContext: !!conversationContext,
    });

    // Step 1: Retrieve memories to inform prompt (not exposed directly to VPU)
    let memories: Memory[] = [];
    progressCb?.({ type: "npu:memories:start", ts: Date.now(), data: { turnId } });
    try {
      memories = await this.memoryService.retrieveRelevantMemories(userInput, personaId, 5, { emotionBias });
    } catch (error) {
      logger.error("Failed to retrieve memories for analyzeAndAdvise", { error, personaId });
    }

    // Build prompt
    logger.debug("analyzeAndAdvise: memories retrieved", { count: memories.length });
    progressCb?.({ type: "npu:memories:done", ts: Date.now(), data: { count: memories.length, memories, turnId } });
    
    // Build memory context string from retrieved memories with partial progress
    const memoryLines = memories
      .map(m => `- ${m.fact_key}: ${m.fact_value} (conf=${(m.confidence_score ?? 0).toFixed(2)}, perm=${m.permanence_score})`);
    for (const line of memoryLines) {
      progressCb?.({ type: "npu:prompt:partial", ts: Date.now(), data: { delta: line + "\n", turnId } });
    }
    const memoryContext = memoryLines.join("\n");

    // Build combined prompt for Flash Lite model
    progressCb?.({ type: "npu:prompt:build", ts: Date.now(), data: { turnId } });
    const combinedPromptText = this.buildCombinedPrompt(userInput, memoryContext, conversationContext);
    progressCb?.({ type: "npu:prompt:built", ts: Date.now(), data: { promptPreview: combinedPromptText.slice(0, 500), fullPrompt: combinedPromptText, turnId } });
    logger.debug("analyzeAndAdvise: combined prompt built", { length: combinedPromptText.length, memoryLines: memories.length });

    // The full prompt is no longer needed after this point, so no need to store it.


    // Call model with retry - single call to Flash Lite model
    const model = "gemini-2.5-flash";
    progressCb?.({ type: "npu:model:start", ts: Date.now(), data: { model, turnId } });
    let responseText = "";
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        progressCb?.({ type: "npu:model:attempt", ts: Date.now(), data: { attempt, turnId } });
        const result = await this.aiClient.models.generateContent({
          contents: [{ role: "user", parts: [{ text: combinedPromptText }] }],
          model,
        });
        responseText = (result.text || "").trim();
        progressCb?.({ type: "npu:model:response", ts: Date.now(), data: { length: responseText.length, turnId } });
        logger.debug("analyzeAndAdvise: model responded", { length: responseText.length, attempt });
        if (responseText) break;
      } catch (error) {
        logger.error("analyzeAndAdvise model call failed", { error, attempt });
        progressCb?.({ type: "npu:model:error", ts: Date.now(), data: { attempt, error: String((error as Error)?.message || error), turnId } });
        if (attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, Math.pow(2, attempt) * 200));
          continue;
        }
      }
    }

    // Use the raw response text as the advisor context, with fallback to memory context
    const advisorContext = responseText || memoryContext || "";
    progressCb?.({ type: "npu:advisor:ready", ts: Date.now(), data: { length: advisorContext.length, turnId } });
    
    const payload: IntentionBridgePayload = {
      advisor_context: advisorContext,
    };

    // Save for MPU (MemoryService) AEI use
    this.lastCombinedPrompt = advisorContext;

    logger.info("analyzeAndAdvise: completed", {
      hasResponseText: !!responseText.length,
    });
    progressCb?.({ type: "npu:complete", ts: Date.now(), data: { hasResponseText: !!responseText.length, turnId } });

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
 
 }
