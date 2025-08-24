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
  constructor(
    private aiClient: AIClient,
    private memoryService: MemoryService,
  ) {}

  /**
   * Unified analysis: retrieve memories, ask model for emotion/confidence + enhanced prompt, return unified context.
   */
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

    // Step 3: Call model
    let responseText = "";
    try {
      const model = "gemini-2.5-flash"; // Main NPU model per design
      const result = await this.aiClient.models.generateContent({
        contents: [{ role: "user", parts: [{ text: unifiedPrompt }] }],
        model,
      });
      responseText = (result.text || "").trim();
    } catch (error) {
      logger.error("Unified analysis model call failed", { error });
    }

    // Step 4: Parse JSON
    let emotion = "neutral";
    let confidence = 0.5;
    let enhancedPrompt = userMessage;

    if (responseText) {
      try {
        const parsed = JSON.parse(responseText) as UnifiedNpuResponse;
        // Prefer nested analysis object, then top-level fields
        const parsedEmotion =
          parsed?.analysis?.emotion ?? (parsed as any)?.emotion;
        const parsedConfidence =
          parsed?.analysis?.confidence ?? (parsed as any)?.confidence;
        const vpuPrompt = parsed?.prompt_for_vpu;

        if (typeof parsedEmotion === "string" && parsedEmotion.trim()) {
          emotion = parsedEmotion.toLowerCase();
        }
        if (
          typeof parsedConfidence === "number" &&
          parsedConfidence >= 0 &&
          parsedConfidence <= 1
        ) {
          confidence = parsedConfidence;
        }
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
      "SYSTEM: You are an intelligent Neural Processing Unit (NPU). Your task is to analyze the user's message, assess their emotional state, and prepare a final prompt for a separate AI to respond to.",
      "You MUST reply with a single, valid JSON object containing two keys: \"analysis\" and \"prompt_for_vpu\".",
      "1. The \"analysis\" key must contain an object with two keys: \n   - \"emotion\": A single lowercase word describing the user's primary emotion from this list: [joy, sadness, anger, fear, surprise, neutral].\n   - \"confidence\": A float between 0.0 and 1.0 representing your confidence in the emotion detection.",
      "2. The \"prompt_for_vpu\" key must contain the final, enhanced prompt string for the VPU (Vocal Processing Unit). This prompt should incorporate the provided context to help the VPU respond naturally. Do not mention the memories or context explicitly in this prompt.",
      contextSection ? contextSection : undefined,
      `USER'S MESSAGE:\n${userMessage}`,
      "Respond ONLY with the JSON object, no markdown fences.",
    ]
      .filter(Boolean)
      .join("\n\n");
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
