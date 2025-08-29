export interface BaseProgressEvent {
  type: string;
  ts: number;
  data?: Record<string, unknown>;
}

export type NpuEventType =
  | "npu:start"
  | "npu:memories:start"
  | "npu:memories:done"
  | "npu:prompt:partial"
  | "npu:prompt:build"
  | "npu:prompt:built"
  | "npu:model:start"
  | "npu:model:attempt"
  | "npu:model:response"
  | "npu:model:error"
  | "npu:advisor:ready"
  | "npu:complete";

export type VpuEventType =
  | "vpu:message:sending"
  | "vpu:message:error"
  | "vpu:response:first-output"
  | "vpu:response:transcription"
  | "vpu:response:complete";

export type NpuProgressEvent = BaseProgressEvent & {
  type: NpuEventType;
};

export type VpuProgressEvent = BaseProgressEvent & {
  type: VpuEventType;
};

// Centralized mapping from events to status strings
export const EVENT_STATUS_MAP: Record<NpuEventType | VpuEventType, string> = {
  "npu:start": "Thinking…",
  "npu:memories:start": "Searching memory…",
  "npu:memories:done": "Memory search complete",
  "npu:prompt:build": "Building prompt…",
  "npu:prompt:built": "Prompt built",
  "npu:model:start": "Preparing NPU…",
  "npu:model:attempt": "Calling NPU…",
  "npu:advisor:ready": "Sending to VPU…",
  "npu:complete": "NPU complete",
  "npu:prompt:partial": "Building prompt…",
  "npu:model:response": "NPU ready",
  "npu:model:error": "NPU error",
  "vpu:message:sending": "Sending to VPU…",
  "vpu:message:error": "VPU error",
  "vpu:response:first-output": "Speaking…",
  "vpu:response:transcription": "Speaking…",
  "vpu:response:complete": "Done"
};

// Active states that should show a spinner
export const ACTIVE_STATES = new Set([
  "npu:start",
  "npu:memories:start",
  "npu:prompt:build",
  "npu:model:start",
  "npu:model:attempt",
  "vpu:message:sending",
  "vpu:response:transcription",
  "vpu:response:first-output"
]);

// Auto-expand rules
export const AUTO_EXPAND_RULES = new Set([
  "npu:memories:start",
  "npu:model:start",
  "npu:model:attempt",
  "vpu:message:sending",
  "vpu:response:transcription",
  "vpu:response:first-output"
]);
