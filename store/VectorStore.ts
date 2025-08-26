import type { AIClient } from "@features/ai/BaseAIService";
import { isEmbeddingClient } from "@features/ai/EmbeddingClient";
import type { Memory } from "@features/memory/Memory";
import { createComponentLogger } from "@services/DebugLogger";
import { type IDBPDatabase, openDB } from "idb";

const logger = createComponentLogger("VectorStore");

const DB_NAME = "vtuber-memory";
const STORE_NAME_PREFIX = "persona-memory-";

export class VectorStore {
  private personaId: string;
  private db: IDBPDatabase | null = null;
  private aiClient: AIClient | null = null;
  private embeddingModel = "gemini-embedding-001";
  private initializationPromise: Promise<void> | null = null;
  private canonicalizationMap: Map<string, string> = new Map(); // Map to store canonical forms of fact_keys

  constructor(
    personaId: string,
    aiClient?: AIClient,
    embeddingModel = "gemini-embedding-001",
  ) {
    this.personaId = personaId;
    this.aiClient = aiClient || null;
    this.embeddingModel = embeddingModel;
    this.initializationPromise = this.init();
    this.initializeDefaultCanonicalForms();
  }

  /**
   * Initialize default canonical forms for common fact_keys
   */
  private initializeDefaultCanonicalForms(): void {
    // Common variations of user name
    this.addCanonicalForm("user's name", "user_name");
    this.addCanonicalForm("username", "user_name");
    this.addCanonicalForm("name", "user_name");
    
    // Common variations of user age
    this.addCanonicalForm("user's age", "user_age");
    this.addCanonicalForm("age", "user_age");
    
    // Common variations of user occupation
    this.addCanonicalForm("user's job", "user_occupation");
    this.addCanonicalForm("user's occupation", "user_occupation");
    this.addCanonicalForm("job", "user_occupation");
    this.addCanonicalForm("occupation", "user_occupation");
    this.addCanonicalForm("work", "user_occupation");
    
    // Common variations of user location
    this.addCanonicalForm("user's location", "user_location");
    this.addCanonicalForm("location", "user_location");
    this.addCanonicalForm("where user lives", "user_location");
    this.addCanonicalForm("user's city", "user_location");
    this.addCanonicalForm("city", "user_location");
    
    // Common variations of user interests
    this.addCanonicalForm("user's interests", "user_interests");
    this.addCanonicalForm("interests", "user_interests");
    this.addCanonicalForm("hobbies", "user_interests");
    
    // Common variations of user emotional state
    this.addCanonicalForm("user's emotional state", "user_emotional_state");
    this.addCanonicalForm("emotional state", "user_emotional_state");
    this.addCanonicalForm("feelings", "user_emotional_state");
    this.addCanonicalForm("mood", "user_emotional_state");
    
    // Common variations of user preferences
    this.addCanonicalForm("user's preferences", "user_preferences");
    this.addCanonicalForm("preferences", "user_preferences");
    this.addCanonicalForm("likes", "user_preferences");
  }

  private getStoreName(): string {
    return `${STORE_NAME_PREFIX}${this.personaId}`;
  }

  async init(): Promise<void> {
    const storeName = this.getStoreName();
    try {
      // Open the DB without a version change first to check its state.
      // This avoids triggering 'blocked' events unnecessarily.
      const db = await openDB(DB_NAME);

      // If the store for the current persona already exists, we're good.
      if (db.objectStoreNames.contains(storeName)) {
        this.db = db;
        return;
      }

      // If the store doesn't exist, we must trigger an upgrade.
      const currentVersion = db.version;
      db.close(); // Close the connection before reopening with a new version.

      logger.debug(
        `Store '${storeName}' not found. Upgrading DB from v${currentVersion} to v${
          currentVersion + 1
        }.`,
      );

      // Re-open with an incremented version to trigger the upgrade callback.
      this.db = await openDB(DB_NAME, currentVersion + 1, {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        upgrade(db, _oldVersion, _newVersion, _tx) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: "id",
              autoIncrement: true,
            });
            store.createIndex("personaId", "personaId", { unique: false });
            store.createIndex("timestamp", "timestamp", { unique: false });
            logger.debug(`Created IndexedDB store: ${storeName}`);
          }
        },
      });

      logger.debug(
        `Successfully upgraded and initialized VectorStore DB: ${DB_NAME} v${this.db.version}`,
      );
    } catch (error) {
      logger.error("Failed to initialize IndexedDB", { error, storeName });
      throw new Error(`VectorStore initialization failed: ${error.message}`);
    }
  }

  async switchPersona(newPersonaId: string): Promise<void> {
    if (this.personaId === newPersonaId && this.db) {
      return; // No change needed if persona is the same and DB is initialized.
    }
    this.personaId = newPersonaId;
    // Close existing DB connection if any before re-initializing
    this.db?.close();
    this.db = null;
    this.initializationPromise = this.init();
    await this.initializationPromise;
    // Clear canonicalization map when switching personas
    this.clearCanonicalForms();
    // Re-initialize default canonical forms for the new persona
    this.initializeDefaultCanonicalForms();
  }

  /**
   * Add a canonical form for a fact_key to reduce near-duplicates
   * @param factKey The original fact_key
   * @param canonicalForm The canonical form of the fact_key
   */
  addCanonicalForm(factKey: string, canonicalForm: string): void {
    this.canonicalizationMap.set(factKey.toLowerCase().trim(), canonicalForm);
  }

  /**
   * Get the canonical form for a fact_key
   * @param factKey The fact_key to canonicalize
   * @returns The canonical form of the fact_key, or the original if no canonical form exists
   */
  getCanonicalForm(factKey: string): string {
    return this.canonicalizationMap.get(factKey.toLowerCase().trim()) || factKey;
  }

  /**
   * Clear all canonical forms
   */
  clearCanonicalForms(): void {
    this.canonicalizationMap.clear();
  }

  /**
   * Set the AI client for embedding generation
   * @param client The AI client that supports embeddings
   * @param embeddingModel The embedding model to use
   */
  setAIClient(client: AIClient, embeddingModel = "gemini-embedding-001"): void {
    this.aiClient = client;
    this.embeddingModel = embeddingModel;
  }

  /**
   * Save a memory entry to the vector store
   * @param memory The memory object to save
   */
  async saveMemory(memory: Omit<Memory, "vector">): Promise<void> {
    await this.initializationPromise;

    try {
      // Canonicalize the fact_key to reduce near-duplicates
      const canonicalFactKey = this.getCanonicalForm(memory.fact_key);
      
      // Generate embedding for the memory content using document task type
      const contentToEmbed = `${canonicalFactKey}: ${memory.fact_value}`;
      const vector = this.aiClient
        ? await this.generateDocumentEmbedding(contentToEmbed)
        : new Array(3072).fill(0); // Fallback to zero vector

      const memoryWithVector: Memory = {
        ...memory,
        fact_key: canonicalFactKey, // Use canonical form
        vector: vector,
      };

      const storeName = this.getStoreName();
      const tx = this.db?.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);

      // Check for duplicates based on fact_key and fact_value
      const existingMemories = await store.getAll();
      // Use semantic similarity to find duplicates
      let bestMatch: Memory | null = null;
      let highestSimilarity = -1;

      for (const existingMemory of existingMemories) {
        if (existingMemory.vector && existingMemory.vector.length > 0) {
          const similarity = this.cosineSimilarity(
            vector,
            existingMemory.vector,
          );
          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = existingMemory;
          }
        }
      }

      // High threshold to ensure we only merge very similar memories
      const SIMILARITY_THRESHOLD = 0.98;
      const duplicate =
        highestSimilarity > SIMILARITY_THRESHOLD ? bestMatch : null;

      if (duplicate) {
        // Update existing memory (reinforcement)
        duplicate.reinforcement_count =
          (duplicate.reinforcement_count || 0) + 1;
        duplicate.last_accessed_timestamp = new Date();
        duplicate.vector = vector; // Update vector as well
        await store.put(duplicate);
        logger.debug("Updated existing memory", {
          factKey: canonicalFactKey,
          reinforcementCount: duplicate.reinforcement_count,
        });
      } else {
        // Save new memory
        await store.add(memoryWithVector);
        logger.debug("Saved new memory", { factKey: canonicalFactKey });
      }

      await tx.done;
    } catch (error) {
      logger.error("Failed to save memory", { error, memory });
      throw error;
    }
  }

  /**
   * Generate embedding for query text using the AI client
   * @param text The query text to embed
   * @returns The embedding vector
   */
  private async generateQueryEmbedding(text: string): Promise<number[]> {
    return this.generateEmbeddingWithTaskType(text, "RETRIEVAL_QUERY");
  }

  /**
   * Generate embedding for document text using the AI client
   * @param text The document text to embed
   * @returns The embedding vector
   */
  private async generateDocumentEmbedding(text: string): Promise<number[]> {
    return this.generateEmbeddingWithTaskType(text, "RETRIEVAL_DOCUMENT");
  }

  /**
   * Generate embedding for the given text using the AI client with specified task type
   * @param text The text to embed
   * @param taskType The task type for optimization (e.g., 'RETRIEVAL_QUERY', 'RETRIEVAL_DOCUMENT')
   * @returns The embedding vector
   */
  private async generateEmbeddingWithTaskType(
    text: string,
    taskType: string,
  ): Promise<number[]> {
    if (!this.aiClient) {
      logger.warn(
        "No AI client available for embedding generation, returning zero vector",
      );
      return new Array(3072).fill(0);
    }

    // Check if the client supports embeddings
    if (!isEmbeddingClient(this.aiClient)) {
      logger.warn(
        "AI client does not support embeddings, returning zero vector",
      );
      return new Array(3072).fill(0);
    }

    try {
      const request = {
        model: this.embeddingModel,
        contents: [text],
        taskType: taskType,
        outputDimensionality: 3072, // Optimized for storage and performance
      };

      const response = await this.aiClient.models.embedContent(request);

      const embedding = response.embeddings?.[0];

      if (!embedding || !embedding.values) {
        logger.warn("Invalid embedding response, returning zero vector", {
          response: response,
        });
        return new Array(3072).fill(0);
      }

      logger.debug("Generated embedding", {
        textLength: text.length,
        embeddingDimensions: embedding.values.length,
        taskType,
      });

      return embedding.values;
    } catch (error) {
      logger.error("Failed to generate embedding", {
        error,
        textLength: text.length,
        taskType,
      });
      // Return zero vector as fallback
      return new Array(3072).fill(0);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch for better performance
   * @param texts Array of texts to embed
   * @param taskType The task type for optimization
   * @returns Array of embedding vectors
   */
  private async generateBatchEmbeddings(
    texts: string[],
    taskType: string,
  ): Promise<number[][]> {
    if (!this.aiClient || !isEmbeddingClient(this.aiClient)) {
      logger.warn(
        "No AI client available for batch embedding generation, returning zero vectors",
      );
      return texts.map(() => new Array(3072).fill(0));
    }

    try {
      const request = {
        model: this.embeddingModel,
        contents: texts,
        taskType: taskType,
        outputDimensionality: 3072,
      };

      const response = await this.aiClient.models.embedContent(request);

      if (!response.embeddings || !Array.isArray(response.embeddings)) {
        logger.warn(
          "Invalid batch embedding response, returning zero vectors",
          {
            response: response,
            textCount: texts.length,
          },
        );
        return texts.map(() => new Array(3072).fill(0));
      }

      const embeddings = response.embeddings.map(
        (emb) => emb.values || new Array(3072).fill(0),
      );

      logger.debug("Generated batch embeddings", {
        textCount: texts.length,
        embeddingDimensions: embeddings[0]?.length || 0,
        taskType,
      });

      return embeddings;
    } catch (error) {
      logger.error("Failed to generate batch embeddings", {
        error,
        textCount: texts.length,
        taskType,
      });
      // Return zero vectors as fallback
      return texts.map(() => new Array(3072).fill(0));
    }
  }

  /**
   * Retrieve all memories for the current persona
   * @returns Array of memory objects
   */
  async getAllMemories(): Promise<Memory[]> {
    await this.initializationPromise;

    const storeName = this.getStoreName();
    const tx = this.db?.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const memories = await store.getAll();
    await tx.done;

    return memories;
  }

  /**
   * Retrieve a single memory by its ID
   * @param memoryId The ID of the memory to retrieve
   * @returns The memory object if found, undefined otherwise
   */
  async getMemoryById(memoryId: number): Promise<Memory | undefined> {
    await this.initializationPromise;

    const storeName = this.getStoreName();
    const tx = this.db?.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const memory = await store.get(memoryId);
    await tx.done;

    return memory;
  }

  /**
   * Search for similar memories based on content using vector similarity
   * @param query The search query
   * @param threshold Similarity threshold (0-1)
   * @returns Array of similar memories
   */
  async searchMemories(query: string, threshold = 0.8): Promise<Memory[]> {
    try {
      await this.initializationPromise;

      // Canonicalize the query to improve matching
      const canonicalQuery = this.getCanonicalForm(query);
      
      // Generate embedding for the query using query task type
      const queryVector = await this.generateQueryEmbedding(canonicalQuery);

      const storeName = this.getStoreName();
      const tx = this.db?.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const allMemories = await store.getAll();
      await tx.done;

      // Calculate cosine similarity for each memory
      const memoriesWithSimilarity = allMemories.map((memory) => {
        if (!memory.vector) {
          return { ...memory, similarity: 0 };
        }

        const similarity = this.cosineSimilarity(queryVector, memory.vector);
        return { ...memory, similarity };
      });

      // Filter by threshold and sort by similarity
      const results = memoriesWithSimilarity
        .filter((memory) => memory.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);

      logger.debug("Memory search completed", {
        query: canonicalQuery,
        totalMemories: allMemories.length,
        relevantResults: results.length,
        threshold,
      });

      return results;
    } catch (error) {
      logger.error("Failed to search memories", {
        error: error.message || error,
        query,
        threshold,
        storeName: this.getStoreName(),
      });
      return [];
    }
  }

  /**
   * Delete a specific memory by its ID
   * @param memoryId The ID of the memory to delete
   */
  async deleteMemory(memoryId: number): Promise<void> {
    await this.initializationPromise;

    try {
      const storeName = this.getStoreName();
      const tx = this.db?.transaction(storeName, "readwrite");
      if (!tx) {
        throw new Error("Could not start a transaction.");
      }
      const store = tx.objectStore(storeName);
      await store.delete(memoryId);
      await tx.done;
      logger.debug("Deleted memory", { memoryId });
    } catch (error) {
      logger.error("Failed to delete memory", { error, memoryId });
      throw error;
    }
  }

  /**
   * Delete all memories for the current persona
   */
  async deleteAllMemories(): Promise<void> {
    await this.initializationPromise;

    try {
      const storeName = this.getStoreName();
      const tx = this.db?.transaction(storeName, "readwrite");
      if (!tx) {
        throw new Error("Could not start a transaction.");
      }
      const store = tx.objectStore(storeName);
      await store.clear();
      await tx.done;
      logger.debug("Deleted all memories for persona", {
        personaId: this.personaId,
      });
    } catch (error) {
      logger.error("Failed to delete all memories", {
        error,
        personaId: this.personaId,
      });
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param vecA First vector
   * @param vecB Second vector
   * @returns Cosine similarity score (0-1)
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      logger.warn("Vectors have different lengths", {
        lenA: vecA.length,
        lenB: vecB.length,
      });
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
}
