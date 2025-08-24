# Unified Cognitive Architecture v1: Implementation Tasks

This document breaks down the implementation of the Unified Cognitive Architecture into a sequential and traceable checklist. Each task is linked back to the originating requirements and design specifications.

---

## Phase 1: Refactor Core Services

This phase focuses on reshaping the NPU and VPU services to align with the new, unified architecture.

*   [ ] **Task 1.1: Define the Intention Bridge Payload**
    *   **Description:** Create the `IntentionBridgePayload` interface in a shared types file to serve as the standardized data structure between the NPU and VPU.
    *   **Traceability:** `Ref: Requirement 1.3, Design section 4`

*   [ ] **Task 1.2: Deprecate Old NPU Methods**
    *   **Description:** In `features/ai/NPUService.ts`, remove the now-redundant `createRAGPrompt()` and `analyzeUserInputEmotion()` methods.
    *   **Traceability:** `Ref: Design section 3.1`

*   [ ] **Task 1.3: Implement the Unified `analyzeAndAdvise` Method Stub**
    *   **Description:** In `features/ai/NPUService.ts`, create the new public method `analyzeAndAdvise(userInput: string): Promise<IntentionBridgePayload>`. Implement the main `try...catch` block and the graceful fallback logic. For now, the `try` block can be a placeholder.
    *   **Traceability:** `Ref: Design sections 3.1, 5`

*   [ ] **Task 1.4: Implement the Unified Gemini API Prompt**
    *   **Description:** Create a new private method within `NPUService.ts` that constructs the complex prompt for the Gemini API. This prompt must instruct the model to perform emotion analysis, memory recall, and advisory prompt construction, returning a single JSON object.
    *   **Traceability:** `Ref: Requirement 1.1, 1.3, Design section 3.1`

*   [ ] **Task 1.5: Implement the Core `analyzeAndAdvise` Logic**
    *   **Description:** Flesh out the `try` block in `analyzeAndAdvise`. It should now call the Gemini API with the new unified prompt, receive the response, strip any markdown fences, and parse the JSON into the `IntentionBridgePayload` object.
    *   **Traceability:** `Ref: Requirement 1.1, Design section 3.1`

## Phase 2: Integrate the New Flow

This phase wires the newly refactored services into the main application controller.

*   [ ] **Task 2.1: Update `main.tsx` to Call `analyzeAndAdvise`**
    *   **Description:** In `app/main.tsx`, modify the `_handleSendMessage` method. Remove the separate calls for memory retrieval and emotion analysis. Replace them with a single call to `NPUService.analyzeAndAdvise`.
    *   **Traceability:** `Ref: Design section 2`

*   [ ] **Task 2.2: Pass the Enriched Prompt to the VPU**
    *   **Description:** In `app/main.tsx`, take the `advisory_prompt_for_vpu` from the returned `IntentionBridgePayload` and pass it to the `textSessionManager.sendMessage` method (which communicates with the VPU).
    *   **Traceability:** `Ref: Design section 2, 3.2`

*   [ ] **Task 2.3: Update Live2D with Unified Emotion Data**
    *   **Description:** In `app/main.tsx`, use the `emotion` and `emotion_confidence` from the `IntentionBridgePayload` to update the Live2D model's emotional state. This replaces any previous emotion detection logic.
    *   **Traceability:** `Ref: Requirement 1.1, Design section 2`

## Phase 3: The Rite of Archiving

This phase respectfully retires the old lore to prevent future confusion.

*   [ ] **Task 3.1: Archive Old Specification Directories**
    *   **Description:** Once the implementation is complete and verified, move the following directories into `docs/specs/.archive/`:
        *   `docs/specs/core-memory-system/`
        *   `docs/specs/vpu-service-refactor/`
        *   `docs/specs/emotional-intelligence-system/`
    *   **Traceability:** `Ref: Requirement, Epic 4`