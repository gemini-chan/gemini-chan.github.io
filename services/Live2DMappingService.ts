export interface ModelMapping {
  modelUrl: string;
  availableEmotions?: string[];
}

const STORAGE_KEY = "live2d-model-mappings";

export class Live2DMappingService {
  static getAll(): ModelMapping[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ModelMapping[];
      return [];
    } catch {
      return [];
    }
  }

  static saveAll(all: ModelMapping[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  static get(modelUrl: string): ModelMapping | undefined {
    const all = this.getAll();
    return all.find((m) => m.modelUrl === modelUrl);
  }

  static getAvailableEmotions(modelUrl: string): string[] {
    const entry = this.get(modelUrl);
    return entry?.availableEmotions ?? [];
  }

  static setAvailableEmotions(modelUrl: string, availableEmotions: string[]) {
    const all = this.getAll();
    const idx = all.findIndex((m) => m.modelUrl === modelUrl);
    if (idx >= 0) {
      const existing = all[idx];
      all[idx] = { ...existing, availableEmotions };
    } else {
      all.push({ modelUrl, availableEmotions });
    }
    this.saveAll(all);
  }
}
