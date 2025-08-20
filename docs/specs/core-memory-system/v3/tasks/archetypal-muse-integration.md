# Tasks: Archetypal Muse Integration (Story 12)

This document outlines the technical tasks required to implement User Story 12, which enables the AI to act as a creative muse using the two-model (NPU → VPU) architecture.

**Developer's Note on Terminology**
- Orchestrator: Internal backend (PersonaManager, VectorStore). Coordinates RAG and model calls.
- NPU (Neural Processing Unit): Strategic thinking model (e.g., gemini-2.5-flash) that constructs the final, detailed prompt for the VPU.
- VPU (Vocal Processing Unit): External text-generation model selected by the Energy Bar system. Generates the final, in-character response.

---

## 1. Orchestrator Enhancements

### Task 1.1: Add Creative Muse Classifier
- Description: Implement a light-weight classifier that extracts two variables from the user’s message: creative_entity and state_of_inquiry.
- Action Items:
  1. Implement a rule-based+few-shot prompt classifier callable by the NPU (fast cheap pass) that returns:
     - creative_entity ∈ {story, dream, art, feeling, project, other | null}
     - state_of_inquiry ∈ {stuck, meaning, crossroads, wonder, other | null}
  2. If both are non-null and semantically relevant, set context_type: 'creative_muse'. Else, do not trigger the muse mode.
- Files: features/persona/PersonaManager.ts

### Task 1.2: Context Assembly for Muse Mode
- Description: When muse mode triggers, augment RAG with creative context.
- Action Items:
  1. Retrieve top conversation chunks tagged with creativity/meaning topics (if tagging exists; otherwise use semantic similarity).
  2. Retrieve top-2 values (from the Values layer) that may influence framing (e.g., beauty, growth) without becoming prescriptive.
  3. Provide a compact context block to the NPU template.
- Files: features/persona/PersonaManager.ts

---

## 2. NPU (Prompt Engineering)

### Task 2.1: Enhance NPU Meta-Prompt Template
- Description: Extend the NPU meta-prompt with a conditional block for context_type: 'creative_muse'.
- Action Items:
  1. Update templates/npu_meta_prompt.txt to include the creative_muse rule block as specified in the story.
  2. Include 2–3 few-shot examples (e.g., dream → archetype; creative project → mythic frame) with high-quality outputs.
  3. Require the VPU to end with one open-ended, non-leading question.
- Files: templates/npu_meta_prompt.txt

### Task 2.2: Guardrails Against Clichés and Psychoanalysis
- Description: Add negative constraints to reduce cliché responses and avoid psychological diagnosis.
- Action Items:
  1. Provide a short “do/don’t” list inside the conditional block.
  2. Add a brevity constraint on archetype explanation.
- Files: templates/npu_meta_prompt.txt

---

## 3. VPU Prompt Synthesis

### Task 3.1: Prompt Envelope for Muse Responses
- Description: Standardize the final prompt sections the NPU must return to the Orchestrator.
- Sections:
  - Persona Instructions
  - Memory/Value Highlights (optional)
  - Creative Muse Guidance (required when context_type === 'creative_muse')
  - Response Rules (must end with an open-ended question)
- Files: templates/npu_meta_prompt.txt

---

## 4. Testing and Validation

### Task 4.1: Unit Tests for Classifier
- Description: Validate classifier correctness and non-trigger cases.
- Action Items:
  1. Positive triggers: (dream + meaning), (story + stuck), (art + wonder).
  2. Negative cases: single-entity mentions only, off-topic chatter, ambiguous phrasing.
- Files: features/persona/__tests__/PersonaManager.test.ts

### Task 4.2: E2E Tests for Muse Flow
- Description: Validate the full Orchestrator → NPU → VPU flow.
- Scenarios:
  1. Dream with stuckness → archetype mapping + open question.
  2. Creative project crossroads → relevant myth + open question.
  3. Non-muse context → standard conversational prompt.
- Files: tests/creative-muse-flow.test.ts

---

## 5. Observability and QA

### Task 5.1: Logging and Traces
- Description: Add trace logs when context_type: 'creative_muse' is set, including classifier outputs and chosen archetype (if surfaced by NPU).
- Files: services/DebugLogger.ts

### Task 5.2: Cliché Monitor (Optional)
- Description: Add a simple heuristic to flag repeated archetypes across a short window and diversify suggestions.
- Files: features/persona/PersonaManager.ts
