export type NpuThinkingLevel = 'lite' | 'standard' | 'deep'

export const NPU_STORAGE_KEYS = {
  model: 'npu-model',
  temperature: 'npu-temperature',
  thinkingLevel: 'npu-thinking-level',
  topP: 'npu-topP',
  topK: 'npu-topK',
  recentTurns: 'npu-recent-turns',
} as const

export const NPU_DEFAULTS = {
  model: 'gemini-2.5-flash',
  temperature: 0.3,
  thinkingLevel: 'standard' as NpuThinkingLevel,
  topP: 0.95,
  topK: 40,
  recentTurns: 10,
} as const

export const NPU_THINKING_TOKENS: Record<NpuThinkingLevel, number> = {
  lite: 256,
  standard: 640,
  deep: 1024,
}

export const NPU_LIMITS = {
  topP: { min: 0, max: 1 },
  topK: { min: 1, max: 100 },
  recentTurns: { min: 2, max: 20 },
} as const
