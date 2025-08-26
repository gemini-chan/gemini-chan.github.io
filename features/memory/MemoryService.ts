import { type AIClient, BaseAIService } from "@features/ai/BaseAIService";
import { createComponentLogger } from "@services/DebugLogger";
import { healthMetricsService } from "@services/HealthMetricsService";
import type { VectorStore } from "@store/VectorStore";
import type { Memory } from "./Memory";

const logger = createComponentLogger("MemoryService");
const MODEL_NAME = "gemini-2.5-flash-lite";

export interface IMemoryService {
  retrieveRelevantMemories(
    query: string,
    sessionId: string,
    topK?: number,
    options?: { emotionBias?: string }
  ): Promise<Memory[]>;
  getLastModelEmotion(): string;
  getAllMemories(): Promise<Memory[]>;
  deleteMemory(memoryId: number): Promise<void>;
  deleteAllMemories(): Promise<void>;
  extractAndStoreFacts(turns: string, sessionId: string, advisorContext?: string): Promise<void>; // New method
  applyTimeDecay(): Promise<void>;
  pinMemory(memoryId: number): Promise<void>;
  unpinMemory(memoryId: number): Promise<void>;
}

export class MemoryService extends BaseAIService implements IMemoryService {
  private vectorStore: VectorStore;

  constructor(vectorStore: VectorStore, client: AIClient) {
    super(client, MODEL_NAME);
    this.vectorStore = vectorStore;
  }

  /**
   * Extract facts from conversation turns and store them
   * @param turns The conversation turns to process
   * @param sessionId The user session ID
   */
  // Store the last model emotion for Live2D animation
  private lastModelEmotion: string = "neutral";
  
  /**
   * Get the last model emotion detected by the NPU
   * @returns The last model emotion or "neutral" if none detected
   */
  getLastModelEmotion(): string {
    return this.lastModelEmotion;
  }
  
  async extractAndStoreFacts(
    turns: string,
    sessionId: string,
    advisorContext?: string,
  ): Promise<void> {
    const stopTimer = healthMetricsService.timeMPUProcessing();
    
    try {
      logger.debug("Extracting facts from turns", {
        sessionId,
        turnsLength: turns.length,
      });

      // Extract emotional context from advisor context if available
      let emotionalFlavor = "";
      let modelEmotion = "neutral";
      if (advisorContext) {
        // Look for USER_EMOTION line in advisor context
        const userEmotionLine = advisorContext.split('\n').find(line => line.startsWith('USER_EMOTION:'));
        if (userEmotionLine) {
          const emotionMatch = userEmotionLine.match(/USER_EMOTION:\s*(\w+)/);
          if (emotionMatch) {
            emotionalFlavor = emotionMatch[1];
          }
        }
        
        // Look for MODEL_EMOTION line in advisor context
        const modelEmotionLine = advisorContext.split('\n').find(line => line.startsWith('MODEL_EMOTION:'));
        if (modelEmotionLine) {
          const emotionMatch = modelEmotionLine.match(/MODEL_EMOTION:\s*(\w+)/);
          if (emotionMatch) {
            modelEmotion = emotionMatch[1];
          }
        }
      }

      // Use Flash Lite to extract facts. Include emotional context when available so each fact can be enriched with an emotional flavor.
      const prompt = `Extract key facts from the following conversation turn. Return a JSON array of facts with keys "fact_key", "fact_value", "confidence_score", "permanence_score", "source", and "emotional_flavor".
Additionally, infer an "emotional_flavor" (e.g., joy, sadness, anger, calm, anxious) and an "emotion_confidence" (0..1) for each fact, based on the emotional context.
The user's emotional state is: ${emotionalFlavor || "neutral"}
The model's emotional state is: ${modelEmotion || "neutral"}

For each fact, also identify whether it's about the user ("user"), about the model's responses ("model"), or about the interaction between user and model ("interaction").

If EMOTIONAL CONTEXT is provided, use it to bias your inference. If not, infer from the turn text itself.

Examples of facts:
- {"fact_key": "user_name", "fact_value": "Alex", "confidence_score": 0.95, "permanence_score": "permanent", "source": "user", "emotional_flavor": "neutral", "emotion_confidence": 0.6}
- {"fact_key": "user_occupation", "fact_value": "software developer", "confidence_score": 0.9, "permanence_score": "permanent", "source": "user", "emotional_flavor": "pride", "emotion_confidence": 0.55}
- {"fact_key": "user_interests", "fact_value": "machine learning and AI", "confidence_score": 0.85, "permanence_score": "permanent", "source": "user", "emotional_flavor": "curiosity", "emotion_confidence": 0.8}
- {"fact_key": "user_project", "fact_value": "building a chatbot", "confidence_score": 0.8, "permanence_score": "temporary", "source": "user", "emotional_flavor": "excitement", "emotion_confidence": 0.75}
- {"fact_key": "model_communication_approach", "fact_value": "helpful and encouraging", "confidence_score": 0.9, "permanence_score": "contextual", "source": "model", "emotional_flavor": "joy", "emotion_confidence": 0.8}

Conversation turn:
${turns}

JSON array of facts:`;

      const response = await this.callAIModel(prompt);

      // Parse the JSON response
      interface ExtractedFact {
        fact_key: string;
        fact_value: string;
        confidence_score: number;
        permanence_score: string;
        emotional_flavor?: string;
        emotion_confidence?: number;
        source?: "user" | "model" | "interaction";
      }
      
      let facts: ExtractedFact[] = [];
      try {
        const jsonResponse = String(response || "").trim();
        // Extract JSON array from response if it's wrapped in markdown
        const jsonMatch = jsonResponse.match(/\[[\s\S]*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : jsonResponse;
        facts = JSON.parse(jsonString);
      } catch (parseError) {
        logger.warn("Failed to parse JSON response, falling back to line parsing", { parseError, response });
        // Fallback to line parsing if JSON parsing fails
        const lines = String(response || "")
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && (/^[-*]\s+/.test(l) || /:\s*/.test(l)));
        
        facts = lines.map(line => {
          // Remove leading bullet if present
          const cleaned = line.replace(/^[-*]\s+/, "");
          const [rawKey, ...rest] = cleaned.split(":");
          const key = (rawKey || "fact").trim().slice(0, 64) || "fact";
          const value = rest.join(":").trim();
          return {
            fact_key: key,
            fact_value: value || cleaned,
            confidence_score: 0.8,
            permanence_score: "contextual"
          } as ExtractedFact;
        });
      }

      // Store each fact in the vector store
      for (const fact of facts) {
        await this.vectorStore.saveMemory({
          fact_key: fact.fact_key || "fact",
          fact_value: fact.fact_value || "",
          confidence_score: fact.confidence_score || 0.8,
          permanence_score: this.normalizePermanenceScore(fact.permanence_score) || "contextual",
          personaId: sessionId,
          timestamp: new Date(),
          conversation_turn: turns,
          emotional_flavor: this.normalizeEmotionLabel(fact.emotional_flavor) || this.normalizeEmotionLabel(emotionalFlavor) || undefined,
          emotion_confidence: fact.emotion_confidence || (emotionalFlavor ? 0.7 : undefined),
          user_emotion: emotionalFlavor || undefined,
          model_emotion: modelEmotion || undefined,
          source: fact.source || undefined,
        });
      }

      logger.info("Fact extraction and storage completed for session", {
        sessionId,
        factCount: facts.length,
      });
      
      // Store the model emotion for Live2D animation
      this.lastModelEmotion = modelEmotion;
    } catch (error) {
      logger.error("Failed to extract and store facts", { error, sessionId });
    } finally {
      stopTimer();
    }
  }

  /**
   * Normalize emotion label to ensure it's one of our canonical set
   * @param emotion The emotion label to normalize
   * @returns Normalized emotion label
   */
  private normalizeEmotionLabel(emotion?: string): string | undefined {
    if (!emotion) return undefined;
    
    const normalized = emotion.toLowerCase().trim();
    
    // Map to our canonical set
    switch (normalized) {
      case "joy":
      case "happy":
      case "pleased":
      case "delighted":
      case "excited":
        return "joy";
      case "sadness":
      case "sad":
      case "depressed":
      case "melancholy":
      case "grief":
        return "sadness";
      case "anger":
      case "angry":
      case "furious":
      case "irritated":
      case "annoyed":
        return "anger";
      case "fear":
      case "afraid":
      case "scared":
      case "anxious":
      case "worried":
        return "fear";
      case "surprise":
      case "surprised":
      case "amazed":
      case "astonished":
        return "surprise";
      case "curiosity":
      case "curious":
      case "interested":
      case "intrigued":
        return "curiosity";
      case "neutral":
      case "calm":
      case "peaceful":
        return "neutral";
      default:
        // Default to neutral for unrecognized emotions
        return "neutral";
    }
  }

  /**
   * Normalize permanence score to ensure it's one of the allowed values
   * @param score The permanence score to normalize
   * @returns Normalized permanence score
   */
  private normalizePermanenceScore(score?: string): "permanent" | "temporary" | "contextual" | undefined {
    if (!score) return undefined;
    
    const normalized = score.toLowerCase().trim();
    switch (normalized) {
      case "permanent":
        return "permanent";
      case "temporary":
        return "temporary";
      case "contextual":
        return "contextual";
      default:
        // Map common synonyms
        if (normalized.includes("long") || normalized.includes("forever") || normalized.includes("always")) {
          return "permanent";
        }
        if (normalized.includes("short") || normalized.includes("brief") || normalized.includes("momentary")) {
          return "temporary";
        }
        return "contextual"; // Default fallback
    }
  }

  /**
   * Retrieve relevant memories for a given query using semantic search
   * @param query The search query to find relevant memories for
   * @param sessionId The user session ID
   * @param topK The number of top memories to retrieve (default: 5)
   * @returns Array of relevant Memory objects
   */
  // Cache for memory search results to improve performance
  private searchCache = new Map<
    string,
    { result: Memory[]; timestamp: number }
  >();
  private readonly CACHE_TTL = 30000; // 30 seconds

  async retrieveRelevantMemories(
    query: string,
    sessionId: string,
    topK: number = 5,
    options?: { emotionBias?: string },
  ): Promise<Memory[]> {
    try {
      // Check cache first (cache key excludes emotion bias to keep it simple and fresh)
      const cacheKey = `${sessionId}:${query.toLowerCase().trim()}`;
      const cached = this.searchCache.get(cacheKey);
      const now = Date.now();

      if (cached && now - cached.timestamp < this.CACHE_TTL) {
        logger.debug("Using cached memory results", { query, sessionId });
        return cached.result.slice(0, topK);
      }

      logger.debug("Retrieving relevant memories", {
        query,
        sessionId,
        topK,
        hasEmotionBias: !!options?.emotionBias,
      });

      // Use the vector store to perform semantic search
      // Note: searchMemories uses similarity threshold (0.8 default), not topK
      const relevantMemories = await this.vectorStore.searchMemories(
        query,
        0.6, // Lower threshold to collect more candidates for re-ranking
      );

      // Re-rank by composite score: similarity, recency, reinforcement, and optional emotion bias
      const HALF_LIFE_HOURS = 72; // 3 days half-life for recency
      const emotionBias = (options?.emotionBias || "").toLowerCase().trim();

      const withScores = relevantMemories.map((m) => {
        const similarity = typeof m.similarity === "number" ? m.similarity : 0;

        // Recency score: exp(-age / halfLife)
        const ts = m.timestamp ? new Date(m.timestamp) : null;
        const ageHours = ts ? Math.max(0, (now - ts.getTime()) / 36e5) : Infinity;
        const recency = ts ? Math.exp(-ageHours / HALF_LIFE_HOURS) : 0;

        // Reinforcement score: 1 - exp(-count / k)
        const count = m.reinforcement_count || 0;
        const reinforcement = 1 - Math.exp(-count / 3);

        // Emotion match boost
        const emo = (m.emotional_flavor || "").toLowerCase().trim();
        const emotionMatch = emotionBias && emo
          ? (emo === emotionBias ? 1 : 0)
          : 0;

        // Weighted composite
        const score = 0.6 * similarity + 0.2 * recency + 0.1 * reinforcement + 0.1 * emotionMatch;
        
        // Debug logging for re-ranking contributions if DEV_DEBUG is enabled
        if (typeof process !== 'undefined' && process.env.DEV_DEBUG === '1') {
          logger.debug("Memory re-ranking contribution", {
            factKey: m.fact_key,
            similarity: similarity.toFixed(3),
            recency: recency.toFixed(3),
            reinforcement: reinforcement.toFixed(3),
            emotionMatch: emotionMatch.toFixed(3),
            compositeScore: score.toFixed(3),
            emotionalFlavor: m.emotional_flavor,
            emotionBias: emotionBias || "none"
          });
        }
        
        return { mem: m, score, similarity, recency, reinforcement, emotionMatch };
      });

      withScores.sort((a, b) => b.score - a.score);
      const limitedMemories = withScores.slice(0, topK).map((x) => x.mem);

      // Cache the result (cache the re-ranked set)
      this.searchCache.set(cacheKey, {
        result: limitedMemories,
        timestamp: now,
      });

      // Clean up old cache entries
      for (const [key, value] of this.searchCache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.searchCache.delete(key);
        }
      }

      logger.debug("Retrieved memories (re-ranked)", {
        query,
        sessionId,
        memoryCount: limitedMemories.length,
        cached: false,
      });

      return limitedMemories;
    } catch (error) {
      logger.error("Failed to retrieve relevant memories", {
        error,
        query,
        sessionId,
        topK,
      });
      return []; // Return empty array on failure
    }
  }

  /**
   * Retrieve all memories for the current persona.
   */
  async getAllMemories(): Promise<Memory[]> {
    try {
      logger.debug("Retrieving all memories");
      const memories = await this.vectorStore.getAllMemories();
      logger.debug("Retrieved all memories", { count: memories.length });
      return memories;
    } catch (error) {
      logger.error("Failed to retrieve all memories", { error });
      return [];
    }
  }

  /**
   * Delete a specific memory by its ID.
   * @param memoryId The ID of the memory to delete.
   */
  async deleteMemory(memoryId: number): Promise<void> {
    try {
      logger.debug("Deleting memory", { memoryId });
      await this.vectorStore.deleteMemory(memoryId);
      logger.debug("Deleted memory successfully", { memoryId });
    } catch (error) {
      logger.error("Failed to delete memory", { error, memoryId });
    }
  }

  /**
   * Delete all memories for the current persona.
   */
  async deleteAllMemories(): Promise<void> {
    try {
      logger.debug("Deleting all memories");
      await this.vectorStore.deleteAllMemories();
      logger.debug("Deleted all memories successfully");
    } catch (error) {
      logger.error("Failed to delete all memories", { error });
    }
  }

  /**
   * Apply time decay to memories based on confidence score and age
   * Lower confidence memories decay faster over time
   */
  async applyTimeDecay(): Promise<void> {
    try {
      logger.debug("Applying time decay to memories");
      const allMemories = await this.getAllMemories();
      const now = Date.now();

      for (const memory of allMemories) {
        // Skip pinned memories
        if (memory.permanence_score === "permanent") continue;

        const age = now - memory.timestamp.getTime();
        const ageInDays = age / (24 * 60 * 60 * 1000);

        // Apply decay based on confidence score and age
        // Lower confidence memories decay faster
        const confidence = memory.confidence_score || 0.5;
        const decayFactor = Math.pow(0.9, ageInDays * (1 - confidence));

        // If decay factor is below threshold, delete the memory
        if (decayFactor < 0.3) {
          logger.debug("Decaying memory due to low confidence and age", {
            factKey: memory.fact_key,
            confidence: confidence,
            ageInDays: ageInDays.toFixed(2),
            decayFactor: decayFactor.toFixed(2)
          });
          await this.deleteMemory(memory.id!);
        }
      }
    } catch (error) {
      logger.error("Failed to apply time decay", { error });
    }
  }

  /**
   * Pin a memory to prevent it from being decayed or deleted
   * @param memoryId The ID of the memory to pin
   */
  async pinMemory(memoryId: number): Promise<void> {
    try {
      logger.debug("Pinning memory", { memoryId });
      const memory = await this.vectorStore.getMemoryById(memoryId);
      if (memory) {
        // Update the permanence score to "permanent" to prevent decay
        memory.permanence_score = "permanent";
        await this.vectorStore.saveMemory(memory);
      }
    } catch (error) {
      logger.error("Failed to pin memory", { error, memoryId });
    }
  }

  /**
   * Unpin a memory to allow it to be decayed or deleted normally
   * @param memoryId The ID of the memory to unpin
   */
  async unpinMemory(memoryId: number): Promise<void> {
    try {
      logger.debug("Unpinning memory", { memoryId });
      const memory = await this.vectorStore.getMemoryById(memoryId);
      if (memory) {
        // Update the permanence score to "contextual" to allow normal decay
        memory.permanence_score = "contextual";
        await this.vectorStore.saveMemory(memory);
      }
    } catch (error) {
      logger.error("Failed to unpin memory", { error, memoryId });
    }
  }
}
