import type { GoogleGenAI } from "@google/genai";
import { createComponentLogger } from "@services/DebugLogger";

const logger = createComponentLogger("BaseAIService");

export interface AIClient {
  models: {
    generateContent: (request: any) => Promise<{ text: string }>;
  };
}

export abstract class BaseAIService {
  protected client: AIClient;
  protected modelName: string;

  constructor(client: AIClient, modelName: string = "gemini-2.5-flash-lite") {
    this.client = client;
    this.modelName = modelName;
  }

  /**
   * Call the AI model with a prompt and return the response text
   * @param prompt The prompt to send to the AI model
   * @returns The response text from the AI model
   */
  protected async callAIModel(prompt: string): Promise<string> {
    try {
      const result = await this.client.models.generateContent({
        model: this.modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      return result.text;
    } catch (error) {
      logger.error("Failed to call AI model", { error });
      throw error;
    }
  }

  /**
   * Parse and validate a JSON response from the AI model
   * @param responseText The raw response text from the AI model
   * @returns The parsed JSON object or null if parsing fails
   */
  protected parseJsonResponse<T>(responseText: string): T | null {
    try {
      return JSON.parse(responseText) as T;
    } catch (error) {
      logger.error("Failed to parse JSON response", { error, responseText });
      return null;
    }
  }
}
