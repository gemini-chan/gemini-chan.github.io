import type { Memory } from "@features/memory/Memory";
import type { IMemoryService } from "@features/memory/MemoryService";
import { createComponentLogger } from "@services/DebugLogger";
import { healthMetricsService } from "@services/HealthMetricsService";
import { NPU_DEFAULTS, NPU_STORAGE_KEYS, NPU_THINKING_TOKENS, NPU_LIMITS, type NpuThinkingLevel } from "@shared/constants";
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
  private static readonly MODEL_CALL_TIMEOUT_MS = 8000;
  private static readonly MAX_CONTEXT_CHARS = 4000;
  private static readonly MAX_MEMORY_LINES = 12;
  private static readonly PERMANENCE_RANK: Record<string, number> = { permanent: 2, contextual: 1, temporary: 0 };
  private lastCombinedPrompt: string | null = null;
  private activeTurnId?: string;
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
    
    // Set active turn ID if provided
    if (turnId) {
      this.activeTurnId = turnId;
    }
    
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
    
    // Rank and limit memories before building context
    const rankedMemories = this._rankAndLimitMemories(memories, NPUService.MAX_MEMORY_LINES);
    
    // Build memory context string from retrieved memories with partial progress
    const memoryLines = rankedMemories
      .map(m => `- ${m.fact_key}: ${m.fact_value} (conf=${(m.confidence_score ?? 0).toFixed(2)}, perm=${m.permanence_score})`);
    for (const line of memoryLines) {
      // No delay for partials
      progressCb?.({ type: "npu:prompt:partial", ts: Date.now(), data: { delta: line + "\n", turnId } });
    }
    const memoryContext = memoryLines.join("\n");

    // Build combined prompt for Flash Lite model
    await this._sendProgress(progressCb, { type: "npu:prompt:build", ts: Date.now(), data: { turnId } });
    const rtStr = typeof localStorage !== 'undefined' ? localStorage.getItem(NPU_STORAGE_KEYS.recentTurns) : null;
    let recentTurns = Number.parseInt(rtStr || String(NPU_DEFAULTS.recentTurns));
    if (Number.isNaN(recentTurns)) recentTurns = NPU_DEFAULTS.recentTurns;
    recentTurns = Math.max(NPU_LIMITS.recentTurns.min, Math.min(NPU_LIMITS.recentTurns.max, recentTurns));
    const recentContext = this.buildRecentTurnsContext(transcript, recentTurns);
    const chosenConversation = conversationContext || recentContext;
    const limitedConversation = this._truncate(chosenConversation);
    const limitedMemory = this._truncate(memoryContext);
    const combinedPromptText = this.buildCombinedPrompt(userInput, limitedMemory, limitedConversation);
    await this._sendProgress(progressCb, { type: "npu:prompt:built", ts: Date.now(), data: { promptPreview: combinedPromptText.slice(0, 500), fullPrompt: combinedPromptText, turnId } });
    logger.debug("analyzeAndAdvise: combined prompt built", { length: combinedPromptText.length, memoryLines: memories.length });

    // The full prompt is no longer needed after this point, so no need to store it.


    // Call model with retry - single call to Flash Lite model
    const model = (typeof localStorage !== 'undefined' ? localStorage.getItem(NPU_STORAGE_KEYS.model) : null) || NPU_DEFAULTS.model;
    const tempStr = (typeof localStorage !== 'undefined' ? localStorage.getItem(NPU_STORAGE_KEYS.temperature) : null);
    const storedThinking = (typeof localStorage !== 'undefined' ? localStorage.getItem(NPU_STORAGE_KEYS.thinkingLevel) : null) || NPU_DEFAULTS.thinkingLevel;
    let temperature: number = NPU_DEFAULTS.temperature;
    if (tempStr !== null && tempStr !== '' && !Number.isNaN(parseFloat(tempStr))) {
      temperature = Math.min(1, Math.max(0, parseFloat(tempStr)));
    }

    const topPStr = typeof localStorage !== 'undefined' ? localStorage.getItem(NPU_STORAGE_KEYS.topP) : null;
    let topP = parseFloat(topPStr || String(NPU_DEFAULTS.topP));
    if (Number.isNaN(topP)) topP = NPU_DEFAULTS.topP;
    topP = Math.max(NPU_LIMITS.topP.min, Math.min(NPU_LIMITS.topP.max, topP));

    const topKStr = typeof localStorage !== 'undefined' ? localStorage.getItem(NPU_STORAGE_KEYS.topK) : null;
    let topK = Number.parseInt(topKStr || String(NPU_DEFAULTS.topK));
    if (Number.isNaN(topK)) topK = NPU_DEFAULTS.topK;
    topK = Math.max(NPU_LIMITS.topK.min, Math.min(NPU_LIMITS.topK.max, topK));

    const thinkingLevel = (Object.keys(NPU_THINKING_TOKENS).includes(storedThinking) ? storedThinking : NPU_DEFAULTS.thinkingLevel) as NpuThinkingLevel;
    const maxTokens = NPU_THINKING_TOKENS[thinkingLevel];

    await this._sendProgress(progressCb, { type: "npu:model:start", ts: Date.now(), data: { model, turnId } });
    let responseText = "";
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Check for stale turn before model call
      if (turnId && this.activeTurnId && this.activeTurnId !== turnId) {
        await this._sendProgress(progressCb, { type: 'npu:stale', ts: Date.now(), data: { turnId, active: this.activeTurnId } }, 0);
        responseText = '';
        break;
      }
      try {
        await this._sendProgress(progressCb, { type: "npu:model:attempt", ts: Date.now(), data: { attempt, turnId } });
        const result = await this._withTimeout(
          this.aiClient.models.generateContent({
            contents: [{ role: "user", parts: [{ text: combinedPromptText }] }],
            model,
            generationConfig: { temperature, topP, topK, maxOutputTokens: maxTokens },
          }),
          NPUService.MODEL_CALL_TIMEOUT_MS,
          "npu-model-call"
        );
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
    private memoryService: IMemoryService,
  ) {}

  /**
   * Wrap a promise with a timeout.
   */
  private async _withTimeout<T>(p: Promise<T>, ms: number, label?: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timeout: ${label || "op"}`)), ms);
    });
    try {
      return await Promise.race([p, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Truncate a string to a maximum length.
   */
  private _truncate(s: string | undefined, max = NPUService.MAX_CONTEXT_CHARS): string {
    if (!s) return "";
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + "…";
  }

  /**
   * Send a progress event and introduce a small delay to allow the UI to update.
   */
  private async _sendProgress(
    progressCb: ((event: { type: string; ts: number; data?: Record<string, unknown> }) => void) | undefined,
    event: { type: string; ts: number; data?: Record<string, unknown> },
    delayMs = 300
  ) {
    try {
      progressCb?.(event);
    } catch (err) {
      logger.warn("_sendProgress callback threw", err);
    }
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
   * Rank and limit memories by permanence, confidence, and timestamp.
   */
  private _rankAndLimitMemories(memories: Memory[], limit: number): Memory[] {
    return memories
      .sort((a, b) => {
        // First sort by permanence rank
        const permRankA = NPUService.PERMANENCE_RANK[a.permanence_score] ?? 0;
        const permRankB = NPUService.PERMANENCE_RANK[b.permanence_score] ?? 0;
        if (permRankA !== permRankB) {
          return permRankB - permRankA;
        }
        
        // Then by confidence score
        const confA = a.confidence_score ?? 0;
        const confB = b.confidence_score ?? 0;
        if (confA !== confB) {
          return confB - confA;
        }
        
        // Finally by timestamp if available
        const tsA = a.timestamp?.getTime() ?? 0;
        const tsB = b.timestamp?.getTime() ?? 0;
        return tsB - tsA;
      })
      .slice(0, limit);
  }

  /**
   * Builds a string containing recent user and model messages from the transcript.
   */
  private buildRecentTurnsContext(transcript: Turn[], lastN = 10): string {
    if (!transcript || transcript.length === 0) return "";
    const recent = transcript.slice(-lastN);
    const messages = recent.map((t) => `- ${t.speaker.toUpperCase()}: ${t.text}`).join("\n");
    return `RECENT CONVERSATION TURNS:\n${messages}`;
  }
}
