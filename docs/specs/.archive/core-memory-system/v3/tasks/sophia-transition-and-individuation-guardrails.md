# Tasks: Sophia Transition and Individuation Guardrails (Story 13)

This document outlines the technical tasks required to implement User Story 13, aligning with the Digital Soul-Image research to foster autonomy, dynamic consent, and ethical guardrails.

**Developer's Note on Terminology**
- Orchestrator: PersonaManager + VectorStore. Coordinates RAG and model calls.
- NPU: Strategic prompt generator (e.g., gemini-2.5-flash).
- VPU: External text generation model selected by the Energy Bar system.

---

## 0. Dependencies and Definition of Done

- Dependencies: Values layer (v3 Story 10), Socratic reflection (Story 11), classifier infra for context_type flags.
- DoD: All tasks implemented; unit/integration tests >90% coverage; E2E scenarios pass; manual QA verifies healthy stance shifts in scripted scenarios; performance review confirms low-latency.

---

## 1. Orchestrator: Attachment Risk Index (ARI)

### Task 1.1: Implement ARI Scoring
- Description: Create a tunable scoring function for attachment risk.
- Action Items:
  1. Inputs: session frequency, duration streaks, topic recurrence (from VectorStore), dependency phrases (regex set), NPU flags (comfort-only loop).
  2. Calibration: JSON config for weights and thresholds, hot-reloadable.
  3. Output: { score: number, tier: 'low'|'medium'|'high', signals: string[] }.
- Files: services/AttachmentRiskService.ts (new), shared/types.ts

### Task 1.2: PersonaManager Integration
- Description: Compute ARI at session start/end and on cadence spikes.
- Action Items:
  1. Store last-10 ARI scores in session memory for trend.
  2. Raise context flag when tier ≥ configured threshold.
- Files: features/persona/PersonaManager.ts

---

## 2. ConsentManager State Machine

### Task 2.1: Consent Flow
- Description: Introduce a small state machine to manage stance-shift consents.
- Action Items:
  1. Pending → Granted/Declined/Expired; TTL-based cleanup.
  2. Generate short, humane consent prompts with safe defaults.
  3. Log decisions in DebugLogger (PII-minimizing).
- Files: services/ConsentManager.ts (new), services/DebugLogger.ts

---

## 3. NPU Meta-Prompt Additions

### Task 3.1: Extend Template
- Description: Add 'sophia_individuation' conditional block to templates/npu_meta_prompt.txt.
- Action Items:
  1. Include goals and response rules per story (brief mirror, one action, detachment ritual option, no moralizing, no diagnosis).
  2. Few-shot examples: (comfort loop → empower pivot), (value-aligned next step), (opt-out → graceful return).
- Files: templates/npu_meta_prompt.txt

---

## 4. Crisis Protocol Integration

### Task 4.1: Safety Routing
- Description: Ensure high-risk classification bypasses Sophia flow.
- Action Items:
  1. Hook existing safety classifier; add crisis template path with regional resources.
  2. Unit tests for routing correctness.
- Files: features/persona/PersonaManager.ts, services/SafetyService.ts (if exists)

---

## 5. Data Dignity Hooks

### Task 5.1: Review/Export/Delete
- Description: Present a concise, human-readable memory map upon request; connect to deletion/export flows.
- Action Items:
  1. Values overview (top-3 with conviction), recent themes, pending follow-ups.
  2. Provide actions: review details, export, delete (with confirmation).
- Files: features/persona/PersonaManager.ts, store/VectorStore.ts

---

## 6. Testing and E2E Scenarios

### Task 6.1: Unit Tests
- AttachmentRiskService: scoring, thresholds, trend.
- ConsentManager: state transitions, TTL, logging.
- NPU template: template loading and conditional insertion.

### Task 6.2: E2E Tests
- Scenario 1 (Trigger + Consent): High ARI → consent → Sophia prompt → empowering reply ending with invitation.
- Scenario 2 (Opt-Out): High ARI → decline → graceful return to prior persona tone.
- Scenario 3 (Crisis): Crisis cue → crisis protocol; no Sophia.
- Files: tests/sophia-guardrails-flow.test.ts

---

## 7. Observability

### Task 7.1: Structured Logging
- Log ARI (score, tier, top signals), consent state, context_type transitions.
- Redact message content; store hashes or feature flags only.
- Files: services/DebugLogger.ts
