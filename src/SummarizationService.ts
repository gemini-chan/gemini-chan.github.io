import { GoogleGenAI } from "@google/genai";
import type { Turn } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-latest";

export class SummarizationService {
  private genAI: GoogleGenAI;

  constructor() {
    this.genAI = new GoogleGenAI(API_KEY);
  }

  async summarize(transcript: Turn[]): Promise<string> {
    if (!transcript || transcript.length === 0) {
      return "";
    }

    try {
      const prompt = this.createPrompt(transcript);
      const result = await this.genAI.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
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
