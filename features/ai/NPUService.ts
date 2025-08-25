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
    // Step 1: Analyze emotion based on last 5 messages
    let emotion: IntentionBridgePayload["emotion"] = "neutral";
    const confidence = 0.5;
    
    try {
      emotion = await this.analyzeTranscriptEmotion(transcript);
      // Confidence is not directly returned by analyzeTranscriptEmotion, so we keep the default
    } catch (error) {
      logger.error("Failed to analyze emotion from transcript", { error, personaId });
    }

    // Step 2: Retrieve memories to inform prompt (not exposed directly to VPU)
    let memories: Memory[] = [];
    try {
      memories = await this.memoryService.retrieveRelevantMemories(userInput, personaId, 5);
    } catch (error) {
      logger.error("Failed to retrieve memories for analyzeAndAdvise", { error, personaId });
    }

    // Build prompt
    const memoryContext = this.formatMemoriesForContext(memories);
    logger.debug("analyzeAndAdvise: memories retrieved", { count: memories.length });
    const enhancedPrompt = this.formulateEnhancedPrompt(userInput, memoryContext, emotion, confidence);
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
      emotion,
      emotion_confidence: confidence,
      rag_prompt_for_vpu: enhancedPrompt,
    };

    // Pass raw response to NPU instead of parsing
    if (responseText) {
      // NPU will handle the raw response
      logger.info("analyzeAndAdvise: raw intention", {
        hasResponseText: !!responseText.length,
        hasRagPrompt: !!payload.rag_prompt_for_vpu?.length,
      });
    }

    return payload;
  }

  constructor(
    private aiClient: AIClient,
    private memoryService: MemoryService,
  ) {}


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
 
 
 
  /**
   * Analyzes the emotional tone of a conversation transcript.
   */
  public async analyzeTranscriptEmotion(transcript: Turn[]): Promise<IntentionBridgePayload["emotion"]> {
    if (!transcript || transcript.length === 0) {
      return "neutral";
    }

    // Build conversation context from transcript
    const conversation = transcript
      .map((turn) => `${turn.speaker}: ${turn.text}`)
      .join("\n");

    // Use the main NPU model for this cognitive task
    const model = "gemini-2.5-flash";
    
    try {
      const prompt = `Analyze the overall emotion of the following conversation. Respond with a single word, such as: joy, sadness, anger, surprise, fear, or neutral.\n\n${conversation}`;
      
      const result = await this.aiClient.models.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        model,
      });
      
      const text = (result.text || "neutral").toLowerCase().trim();
      
      // Validate the emotion is one of the allowed values
      const allowed = ["joy", "sadness", "anger", "fear", "surprise", "neutral", "curiosity"];
      if (allowed.includes(text)) {
        return text as IntentionBridgePayload["emotion"];
      }
      
      return "neutral";
    } catch (error) {
      logger.error("Error analyzing emotion from transcript:", { error });
      return "neutral"; // Fallback to neutral on error
    }
  }
 
 }
