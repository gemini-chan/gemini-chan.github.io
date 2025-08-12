import { GoogleGenAI } from "@google/genai";
import type { Turn } from "../types";

const MODEL_NAME = "gemini-1.5-flash-latest";

export class SummarizationService {
  private genAI: GoogleGenAI;

  constructor(client: GoogleGenAI) {
    this.genAI = client;
  }

  async summarize(transcript: Turn[]): Promise<string> {
    if (!transcript || transcript.length === 0) {
      return "";
    }

    try {
      const prompt = this.createPrompt(transcript);
      const result = await this.genAI.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      return result.text;
    } catch (error) {
      console.error("Error summarizing transcript:", error);
      return "";
    }
  }

  private createPrompt(transcript: Turn[]): string {
    const conversation = transcript
      .map((turn) => `${turn.speaker}: ${turn.text}`)
      .join("\n");
    return `Summarize the following conversation:\n\n${conversation}`;
  }
}
