import { type AIClient, BaseAIService } from "@features/ai/BaseAIService";
import type { Turn } from "@shared/types";

const MODEL_NAME = "gemini-2.5-flash-lite";

export class EmotionService extends BaseAIService {
  constructor(client: AIClient) {
    super(client, MODEL_NAME);
  }

  async analyzeEmotion(transcript: Turn[]): Promise<string> {
    if (!transcript || transcript.length === 0) {
      return "neutral";
    }

    try {
      const prompt = this.createPrompt(transcript);
      const result = await this.callAIModel(prompt);
      // Basic parsing for now, can be improved with more structured output
      return result.toLowerCase().trim();
    } catch (error) {
      console.error("Error analyzing emotion:", error);
      return "neutral"; // Fallback to neutral on error
    }
  }

  private createPrompt(transcript: Turn[]): string {
    const conversation = transcript
      .map((turn) => `${turn.speaker}: ${turn.text}`)
      .join("\n");
    return `Analyze the overall emotion of the following conversation. Respond with a single word, such as: joy, sadness, anger, surprise, fear, or neutral.\n\n${conversation}`;
  }
}