import { createComponentLogger } from "@services/DebugLogger";
import {
  type EmbeddingRequest,
  type EmbeddingResponse,
  isEmbeddingClient,
} from "./EmbeddingClient";

export interface GenerateContentRequest {
  model: string;
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
}

export interface AIClient {
  models: {
    generateContent: (
      request: GenerateContentRequest,
    ) => Promise<{ text: string }>;
  };
}

const logger = createComponentLogger("BaseAIService");

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
   * Generate embeddings for the given text using the embedding model
   * @param text The text to embed
   * @param model The embedding model to use
   * @param taskType The task type for the embedding
   * @param outputDimensionality The output dimensionality for the embedding
   * @returns The embedding vector
   */
  protected async generateEmbedding(
    text: string,
    model: string = "gemini-embedding-001",
    taskType: string = "SEMANTIC_SIMILARITY",
    outputDimensionality: number = 3072,
  ): Promise<number[]> {
    try {
      // Check if the client supports embeddings
      if (isEmbeddingClient(this.client)) {
        const request: EmbeddingRequest = {
          model: model,
          contents: [text],
          taskType: taskType,
          outputDimensionality: outputDimensionality,
        };

        const response: EmbeddingResponse =
          await this.client.models.embedContent(request);
        return response.embeddings[0].values;
      } else {
        logger.warn(
          "Client does not support embeddings, returning empty vector",
          {
            model,
            textLength: text.length,
            taskType,
            outputDimensionality,
          },
        );
        // Return a zero vector of appropriate size as fallback
        return new Array(outputDimensionality).fill(0);
      }
    } catch (error) {
      logger.error("Failed to generate embedding", {
        error,
        model,
        textLength: text.length,
        taskType,
        outputDimensionality,
      });
      // Return a zero vector as fallback
      return new Array(outputDimensionality).fill(0);
    }
  }

  /**
   * Parse and validate a JSON response from the AI model
   * @param responseText The raw response text from the AI model
   * @returns The parsed JSON object or null if parsing fails
   */
  protected parseJsonResponse<T>(): T | null {
    // Removed parser as NPU will handle raw response
    return null;
  }
}
