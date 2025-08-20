import type { Memory } from "@features/memory/Memory";
import { createComponentLogger } from "@services/DebugLogger";
import { type IDBPDatabase, openDB } from "idb";

const logger = createComponentLogger("VectorStore");

const DB_NAME = "vtuber-memory";
const DB_VERSION = 1;
const STORE_NAME_PREFIX = "persona-memory-";

export class VectorStore {
  private personaId: string;
  private db: IDBPDatabase | null = null;

  constructor(personaId: string) {
    this.personaId = personaId;
  }

  private getStoreName(): string {
    return `${STORE_NAME_PREFIX}${this.personaId}`;
  }

  async init(): Promise<void> {
    const storeName = this.getStoreName();
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      },
    });
  }

  async switchPersona(newPersonaId: string): Promise<void> {
    this.personaId = newPersonaId;
    // No need to close the current DB connection, just ensure the new store exists.
    await this.init();
  }

  /**
   * Save a memory entry to the vector store
   * @param memory The memory object to save
   */
  async saveMemory(memory: Memory): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const storeName = this.getStoreName();
    const tx = this.db!.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    // Check for duplicates based on fact_key and fact_value
    const existingMemories = await store.getAll();
    const duplicate = existingMemories.find(
      (m: Memory) =>
        m.fact_key === memory.fact_key && m.fact_value === memory.fact_value,
    );

    if (duplicate) {
      // Update existing memory (reinforcement)
      duplicate.reinforcement_count = (duplicate.reinforcement_count || 0) + 1;
      duplicate.last_accessed_timestamp = new Date();
      await store.put(duplicate);
      logger.debug("Updated existing memory", {
        factKey: memory.fact_key,
        reinforcementCount: duplicate.reinforcement_count,
      });
    } else {
      // Save new memory
      await store.add(memory);
      logger.debug("Saved new memory", { factKey: memory.fact_key });
    }

    await tx.done;
  }

  /**
   * Retrieve all memories for the current persona
   * @returns Array of memory objects
   */
  async getAllMemories(): Promise<Memory[]> {
    if (!this.db) {
      await this.init();
    }

    const storeName = this.getStoreName();
    const tx = this.db!.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const memories = await store.getAll();
    await tx.done;

    return memories;
  }

  /**
   * Search for similar memories based on content
   * @param query The search query
   * @param threshold Similarity threshold (0-1)
   * @returns Array of similar memories
   */
  async searchMemories(
    query: string,
    threshold: number = 0.8,
  ): Promise<Memory[]> {
    if (!this.db) {
      await this.init();
    }

    const storeName = this.getStoreName();
    const tx = this.db!.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const allMemories = await store.getAll();
    await tx.done;

    // Simple text-based similarity search (in a real implementation, this would use vector embeddings)
    return allMemories.filter((memory) => {
      const content = `${memory.fact_key} ${memory.fact_value}`.toLowerCase();
      const queryLower = query.toLowerCase();

      // Calculate simple string similarity (Jaccard similarity)
      const contentWords = new Set(content.split(/\s+/));
      const queryWords = new Set(queryLower.split(/\s+/));

      const intersection = new Set(
        [...contentWords].filter((x) => queryWords.has(x)),
      );
      const union = new Set([...contentWords, ...queryWords]);

      const similarity = intersection.size / union.size;
      return similarity >= threshold;
    });
  }
}
