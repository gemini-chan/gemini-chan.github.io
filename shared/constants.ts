export type NpuThinkingLevel = 'lite' | 'standard' | 'deep';

export const NPU_STORAGE_KEYS = {
  model: 'npu-model',
  temperature: 'npu-temperature',
  thinkingLevel: 'npu-thinking-level',
} as const;

export const NPU_DEFAULTS = {
  model: 'gemini-2.5-flash',
  temperature: 0.3,
  thinkingLevel: 'standard' as NpuThinkingLevel,
} as const;

export const NPU_THINKING_TOKENS: Record<NpuThinkingLevel, number> = {
  lite: 256,
  standard: 640,
  deep: 1024,
};
