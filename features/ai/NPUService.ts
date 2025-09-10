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
    
    // No delay on first event
    progressCb?.({ type: "npu:start", ts: Date.now(), data: { personaId, userInput, transcriptLength: transcript?.length ?? 0, turnId } });
    logger.debug("analyzeAndAdvise: start", {
      personaId,
      userInputLength: userInput?.length ?? 0,
      transcriptLength: transcript?.length ?? 0,
      hasConversationContext: !!conversationContext,
    });

    // Step 1: Retrieve memories to inform prompt (not exposed directly to VPU)
    let memories: Memory[] = [];
    await this._sendProgress(progressCb, { type: "npu:memories:start", ts: Date.now(), data: { turnId } });
    try {
      memories = await this.memoryService.retrieveRelevantMemories(userInput, personaId, 5, { emotionBias });
    } catch (error) {
      logger.error("Failed to retrieve memories for analyzeAndAdvise", { error, personaId });
    }

    // Build prompt
    logger.debug("analyzeAndAdvise: memories retrieved", { count: memories.length });
    await this._sendProgress(progressCb, { type: "npu:memories:done", ts: Date.now(), data: { count: memories.length, memories, turnId } });
    
    // Build memory context string from retrieved memories with partial progress
    const memoryLines = memories
      .map(m => `- ${m.fact_key}: ${m.fact_value} (conf=${(m.confidence_score ?? 0).toFixed(2)}, perm=${m.permanence_score})`);
    for (const line of memoryLines) {
      // No delay for partials
      progressCb?.({ type: "npu:prompt:partial", ts: Date.now(), data: { delta: line + "\n", turnId } });
    }
    const memoryContext = memoryLines.join("\n");

    // Build combined prompt for Flash Lite model
    await this._sendProgress(progressCb, { type: "npu:prompt:build", ts: Date.now(), data: { turnId } });
    const recentContext = this.buildRecentTurnsContext(transcript, 5);
    const combinedPromptText = this.buildCombinedPrompt(userInput, memoryContext, conversationContext || recentContext);
    await this._sendProgress(progressCb, { type: "npu:prompt:built", ts: Date.now(), data: { promptPreview: combinedPromptText.slice(0, 500), fullPrompt: combinedPromptText, turnId } });
    logger.debug("analyzeAndAdvise: combined prompt built", { length: combinedPromptText.length, memoryLines: memories.length });

    // The full prompt is no longer needed after this point, so no need to store it.


    // Call model with retry - single call to Flash Lite model
    const storedModel = (typeof localStorage !== 'undefined' ? localStorage.getItem('npu-model') : null) || 'gemini-2.5-flash';
    const tempStr = (typeof localStorage !== 'undefined' ? localStorage.getItem('npu-temperature') : null);
    const thinking = (typeof localStorage !== 'undefined' ? localStorage.getItem('npu-thinking-level') : null) || 'standard';
    const temperature = Number.isFinite(Number(tempStr)) ? Math.min(1, Math.max(0, Number(tempStr))) : 0.3;
    const maxTokens = thinking === 'deep' ? 1024 : thinking === 'lite' ? 256 : 640;
    const model = storedModel;

    await this._sendProgress(progressCb, { type: "npu:model:start", ts: Date.now(), data: { model, turnId } });
    let responseText = "";
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this._sendProgress(progressCb, { type: "npu:model:attempt", ts: Date.now(), data: { attempt, turnId } });
        const result = await this.aiClient.models.generateContent({
          contents: [{ role: "user", parts: [{ text: combinedPromptText }] }],
          model,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        });
        responseText = (result.text || "").trim();
        await this._sendProgress(progressCb, { type: "npu:model:response", ts: Date.now(), data: { length: responseText.length, turnId } });
        logger.debug("analyzeAndAdvise: model responded", { length: responseText.length, attempt });
        if (responseText) break;
      } catch (error) {
        logger.error("analyzeAndAdvise model call failed", { error, attempt });
        await this._sendProgress(progressCb, { type: "npu:model:error", ts: Date.now(), data: { attempt, error: String((error as Error)?.message || error), turnId } }, 0);
        if (attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, Math.pow(2, attempt) * 200));
          continue;
        }
      }
    }

    // Use the raw response text as the advisor context, with fallback to memory context
    const advisorContext = responseText || memoryContext || "";
    await this._sendProgress(progressCb, { type: "npu:advisor:ready", ts: Date.now(), data: { length: advisorContext.length, turnId } });
    
    const payload: IntentionBridgePayload = {
      advisor_context: advisorContext,
    };

    // Save for MPU (MemoryService) AEI use
    this.lastCombinedPrompt = advisorContext;

    logger.info("analyzeAndAdvise: completed", {
      hasResponseText: !!responseText.length,
    });
    // No delay on final event
    progressCb?.({ type: "npu:complete", ts: Date.now(), data: { hasResponseText: !!responseText.length, turnId } });

    stopTimer();
    return payload;
  }

  constructor(
    private aiClient: AIClient,
    private memoryService: MemoryService,
  ) {}

  /**
   * Send a progress event and introduce a small delay to allow the UI to update.
   */
  private async _sendProgress(
    progressCb: ((event: { type: string; ts: number; data?: Record<string, unknown> }) => void) | undefined,
    event: { type: string; ts: number; data?: Record<string, unknown> },
    delayMs = 300
  ) {
    progressCb?.(event);
    if (progressCb && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

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
   * Builds a string containing recent user and model messages from the transcript.
   */
  private buildRecentTurnsContext(transcript: Turn[], lastN = 5): string {
    if (!transcript || transcript.length === 0) {
      return "";
    }

    const userTurns = transcript.filter((turn) => turn.speaker === "user").slice(-lastN);
    const modelTurns = transcript.filter((turn) => turn.speaker === "model").slice(-lastN);

    const sections: string[] = [];

    if (userTurns.length > 0) {
      const userMessages = userTurns.map((turn) => `- ${turn.text}`).join("\n");
      sections.push(`RECENT USER MESSAGES:\n${userMessages}`);
    }

    if (modelTurns.length > 0) {
      const modelMessages = modelTurns.map((turn) => `- ${turn.text}`).join("\n");
      sections.push(`RECENT MODEL MESSAGES:\n${modelMessages}`);
    }

    return sections.join("\n\n");
  }
}
