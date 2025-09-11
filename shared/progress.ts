export interface BaseProgressEvent {
  type: string
  ts: number
  data?: Record<string, unknown>
}

export type NpuEventType =
  | 'npu:start'
  | 'npu:memories:start'
  | 'npu:memories:done'
  | 'npu:prompt:partial'
  | 'npu:prompt:build'
  | 'npu:prompt:built'
  | 'npu:model:start'
  | 'npu:model:attempt'
  | 'npu:model:response'
  | 'npu:model:error'
  | 'npu:advisor:ready'
  | 'npu:complete'

export type VpuEventType =
  | 'vpu:message:sending'
  | 'vpu:message:error'
  | 'vpu:response:first-output'
  | 'vpu:response:transcription'
  | 'vpu:response:complete'

export type NpuProgressEvent = BaseProgressEvent & {
  type: NpuEventType
}

export type VpuProgressEvent = BaseProgressEvent & {
  type: VpuEventType
}

// Centralized mapping from events to status strings
export const EVENT_STATUS_MAP: Record<NpuEventType | VpuEventType, string> = {
  'npu:start': 'Thinking… ✨',
  'npu:memories:start': 'Remembering…',
  'npu:memories:done': 'Remembered!',
  'npu:prompt:build': 'Choosing my words…',
  'npu:prompt:built': 'Hmm, what to say…',
  'npu:model:start': 'Warming up my magic…',
  'npu:model:attempt': 'Weaving a reply…',
  'npu:advisor:ready': "I've got a thought! ✨",
  'npu:complete': 'Thinking complete!',
  'npu:prompt:partial': 'Choosing my words…', // Re-using for partial state
  'npu:model:response': 'Got it! ✨',
  'npu:model:error': 'A little hiccup…',
  'vpu:message:sending': 'Here it comes…',
  'vpu:message:error': 'My voice stumbled…',
  'vpu:response:first-output': 'Typing… ⌨️',
  'vpu:response:transcription': 'Typing… ⌨️',
  'vpu:response:complete': "And that's that! ✨",
}

// Active states that should show a spinner
export const ACTIVE_STATES = new Set([
  'npu:start',
  'npu:memories:start',
  'npu:prompt:build',
  'npu:model:start',
  'npu:model:attempt',
  'vpu:message:sending',
  'vpu:response:transcription',
  'vpu:response:first-output',
])

// Auto-expand rules
export const AUTO_EXPAND_RULES = new Set([
  'npu:memories:start',
  'npu:model:start',
  'npu:model:attempt',
  'vpu:message:sending',
  'vpu:response:transcription',
  'vpu:response:first-output',
])
