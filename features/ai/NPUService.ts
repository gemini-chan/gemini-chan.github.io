import type { Memory } from "@features/memory/Memory";
import type { MemoryService } from "@features/memory/MemoryService";
import { createComponentLogger } from "@services/DebugLogger";
import type { Turn, IntentionBridgePayload } from "@shared/types";
import type { AIClient } from "./BaseAIService";

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

// The model will now only return emotion analysis.
interface ModelEmotionAnalysisLike {
  emotion?: IntentionBridgePayload["emotion"] | string;
  emotion_confidence?: number;
  // Back-compat keys the model might return
  analysis?: { emotion?: string; confidence?: number };
  confidence?: number;
  rag_prompt_for_vpu?: string;
  prompt_for_vpu?: string;
}

export class NPUService {
  /**
   * v1: analyze user input and return IntentionBridgePayload for VPU.
   * Performs a single model call, parses JSON, and applies graceful fallback.
   */
  public async analyzeAndAdvise(userInput: string, personaId: string, conversationContext?: string): Promise<IntentionBridgePayload> {
    logger.debug("analyzeAndAdvise: start", {
      personaId,
      userInputLength: userInput?.length ?? 0,
      hasConversationContext: !!conversationContext,
    });
    // Retrieve memories to inform prompt (not exposed directly to VPU)
    let memories: Memory[] = [];
    try {
      memories = await this.memoryService.retrieveRelevantMemories(userInput, personaId, 5);
    } catch (error) {
      logger.error("Failed to retrieve memories for analyzeAndAdvise", { error, personaId });
    }

    // Build prompt
    const memoryContext = this.formatMemoriesForContext(memories);
    logger.debug("analyzeAndAdvise: memories retrieved", { count: memories.length });
    const unifiedPrompt = this.buildUnifiedPrompt(userInput, memoryContext, conversationContext);
    logger.debug("analyzeAndAdvise: unified prompt built", { length: unifiedPrompt.length });

    // Call model with retry
    const model = "gemini-2.5-flash";
    let responseText = "";
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.aiClient.models.generateContent({
          contents: [{ role: "user", parts: [{ text: unifiedPrompt }] }],
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

    // Parse
    const payload: IntentionBridgePayload = {
      emotion: "neutral",
      emotion_confidence: 0.5,
      rag_prompt_for_vpu: userInput,
    };

    if (responseText) {
      try {
        const cleaned = responseText
          .replace(/^```json\s*/, "")
          .replace(/^```\s*/, "")
          .replace(/```$/, "")
          .trim();
        const parsed = JSON.parse(cleaned) as ModelEmotionAnalysisLike;

        // emotion
        let em = parsed.emotion ?? parsed?.analysis?.emotion;
        const allowed = ["joy","sadness","anger","fear","surprise","neutral","curiosity"];
        if (typeof em === "string") {
          em = em.toLowerCase();
          if (allowed.includes(em)) payload.emotion = em as IntentionBridgePayload["emotion"];
        }

        // confidence
        const conf = parsed.emotion_confidence ?? parsed.confidence ?? parsed?.analysis?.confidence;
        if (typeof conf === "number" && conf >= 0 && conf <= 1) {
          payload.emotion_confidence = conf;
        }

        // Per user instruction, the prompt for the VPU is now the original user input.
        payload.rag_prompt_for_vpu = userInput;

        logger.info("analyzeAndAdvise: parsed intention", {
          emotion: payload.emotion,
          confidence: payload.emotion_confidence,
          hasRagPrompt: !!payload.rag_prompt_for_vpu?.length,
        });
      } catch (error) {
        logger.error("Failed to parse analyzeAndAdvise JSON", { error, responseText });
      }
    }

    return payload;
  }

  constructor(
    private aiClient: AIClient,
    private memoryService: MemoryService,
  ) {}

  /**
   * Unified analysis: retrieve memories, ask model for emotion/confidence + enhanced prompt, return unified context.
   */
  // Deprecated: analyzeAndPrepareContext will be superseded by analyzeAndAdvise but kept for back-compat
  async analyzeAndPrepareContext(
    userMessage: string,
    personaId: string,
    conversationContext?: string,
  ): Promise<UnifiedContext> {
    // Step 1: Retrieve relevant memories
    let retrievedMemories: Memory[] = [];
    try {
      retrievedMemories = await this.memoryService.retrieveRelevantMemories(
        userMessage,
        personaId,
        5,
      );
    } catch (error) {
      logger.error("Failed to retrieve memories for unified analysis", {
        error,
        personaId,
      });
    }

    // Step 2: Build unified prompt instructing JSON output
    const memoryContext = this.formatMemoriesForContext(retrievedMemories);
    const unifiedPrompt = this.buildUnifiedPrompt(
      userMessage,
      memoryContext,
      conversationContext,
    );

    // Step 3: Call model with exponential backoff
    const model = "gemini-2.5-flash";
    let responseText = "";
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.aiClient.models.generateContent({
          contents: [{ role: "user", parts: [{ text: unifiedPrompt }] }],
          model,
        });
        responseText = (result.text || "").trim();
        if (responseText) break;
      } catch (error) {
        logger.error("Unified analysis model call failed", { error, attempt });
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 200; // 400, 800 ms
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
      }
    }

    // Step 4: Parse JSON into IntentionBridgePayload-like structure with graceful fallback
    let emotion: IntentionBridgePayload["emotion"] = "neutral";
    let confidence = 0.5;
    let enhancedPrompt = userMessage;

    if (responseText) {
      try {
        // Pre-process the response to remove markdown fences
        const cleanedResponseText = responseText
          .replace(/^```json\s*/, "")
          .replace(/^```\s*/, "")
          .replace(/```$/, "")
          .trim();
        const parsed = JSON.parse(cleanedResponseText) as ModelEmotionAnalysisLike;

        // Extract emotion
        let parsedEmotion = parsed.emotion ?? parsed?.analysis?.emotion;
        if (typeof parsedEmotion === "string") {
          parsedEmotion = parsedEmotion.toLowerCase() as string;
          const allowed = [
            "joy",
            "sadness",
            "anger",
            "fear",
            "surprise",
            "neutral",
            "curiosity",
          ];
          if (allowed.includes(parsedEmotion)) {
            emotion = parsedEmotion as IntentionBridgePayload["emotion"];
          }
        }

        // Extract confidence
        const parsedConfidence = parsed.emotion_confidence ?? parsed.confidence ?? parsed?.analysis?.confidence;
        if (
          typeof parsedConfidence === "number" &&
          parsedConfidence >= 0 &&
          parsedConfidence <= 1
        ) {
          confidence = parsedConfidence;
        }

        // Extract advisory prompt
        const vpuPrompt = parsed.rag_prompt_for_vpu ?? parsed.prompt_for_vpu;
        if (typeof vpuPrompt === "string" && vpuPrompt.trim()) {
          enhancedPrompt = vpuPrompt;
        } else {
          // If not provided, fall back to creating an enhanced prompt that does not expose memory source
          enhancedPrompt = this.formulateEnhancedPrompt(
            userMessage,
            memoryContext,
            conversationContext,
          );
        }
      } catch (error) {
        logger.error("Failed to parse unified JSON response", {
          error,
          responseText,
        });
        // Fall back to original user message per design
        enhancedPrompt = userMessage;
      }
    } else {
      // Model gave no usable response
      enhancedPrompt = userMessage;
    }

    return { emotion, confidence, retrievedMemories, enhancedPrompt };
  }

  // v1 unified prompt for model to return IntentionBridgePayload JSON
  private buildUnifiedPrompt(
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

    return [
      "SYSTEM: You are an intelligent Neural Processing Unit (NPU). Your task is to analyze the user's message for its emotional content, considering the provided conversation context and memories.",
      "Respond ONLY with a single, valid JSON object matching this TypeScript interface:",
      "interface EmotionAnalysis { emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'neutral' | 'curiosity'; emotion_confidence: number; }",
      "Rules:",
      "- Always include the exact keys: emotion, emotion_confidence.",
      "- emotion must be lowercase and one of the allowed values.",
      "- emotion_confidence must be a float between 0 and 1.",
      contextSection ? contextSection : undefined,
      `USER'S MESSAGE:\n${userMessage}`,
      "Return ONLY the JSON object. No markdown fences, no commentary.",
    ]
      .filter(Boolean)
      .join("\n\n");
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
  // TODO(v1-archive): this legacy method remains for background AEI until unified refactor replaces it.
  async analyzeEmotion(
    transcript: Turn[],
    energyLevel: number,
  ): Promise<string> {
    if (!transcript || transcript.length === 0) {
      return "neutral";
    }

    // Determine model based on energy level
    const model =
      energyLevel >= 2 ? "gemini-2.5-flash" : "gemini-2.5-flash-lite";
    logger.debug("Analyzing emotion with model based on energy level", {
      model,
      energyLevel,
    });

    try {
      const prompt = this.createEmotionPrompt(transcript);
      // Use the main NPU model for this cognitive task
      const result = await this.aiClient.models.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        model,
      });
      const text = result.text;
      return text.toLowerCase().trim();
    } catch (error) {
      logger.error("Error analyzing emotion:", { error, model, energyLevel });
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
