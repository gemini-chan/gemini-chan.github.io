export type EmotionKey = "neutral" | "joy" | "sadness" | "anger" | "fear" | "surprise" | "curiosity" | string;

export interface ParamKV { id: string; value: number }
export interface MotionRef { group: string; index: number }

export interface EmotionMapping {
  params?: ParamKV[];
  motion?: MotionRef;
}

export interface ModelMapping {
  modelUrl: string;
  emotions: Record<EmotionKey, EmotionMapping>;
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

  static set(modelUrl: string, emotions: Record<EmotionKey, EmotionMapping>) {
    const all = this.getAll();
    const idx = all.findIndex((m) => m.modelUrl === modelUrl);
    const entry: ModelMapping = { modelUrl, emotions };
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    this.saveAll(all);
  }
}
