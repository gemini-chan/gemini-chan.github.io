import { openDB } from "idb";

const DB_NAME = "vtuber-memory";
const DB_VERSION = 1;
const STORE_NAME_PREFIX = "persona-memory-";

import type { IDBPDatabase } from "idb";

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
}
