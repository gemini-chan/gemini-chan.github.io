# AEI System v3: Unified NPU-TTS Flow - Implementation Plan

This document outlines the development tasks required to implement the AEI System v3. The tasks are derived from the approved `requirements.md` and `design.md` for this feature.

---

### Epic 1: The Seer's Unified Gaze (NPU Refactoring)

#### Objective: Reforge the NPU to perform unified emotional and contextual analysis.

-   **[ ] Task 1.1: Define Unified Context Data Structures**
    -   **File:** `features/ai/NPUService.ts`
    -   **Details:** Implement the `UnifiedNpuResponse` and `UnifiedContext` interfaces as specified in the design document.
    -   **Traceability:** `Ref: Requirement 1.1, Design section 3.1`

-   **[ ] Task 1.2: Implement the Unified NPU Analysis Method**
    -   **File:** `features/ai/NPUService.ts`
    -   **Details:** Create the new `analyzeAndPrepareContext` method. This method will be responsible for retrieving memories, constructing the unified prompt with JSON output instructions, calling the Gemini API, and parsing the structured response. It must include graceful error handling for JSON parsing failures.
    -   **Traceability:** `Ref: Requirement 1.1, 1.2, Design sections 3.1, 3.2, 4`

-   **[ ] Task 1.3: Deprecate Old NPU Methods**
    -   **File:** `features/ai/NPUService.ts`
    -   **Details:** Mark the old `analyzeUserInputEmotion` and `createRAGPrompt` methods as deprecated or remove them if they are no longer used anywhere in the application after the refactor.
    -   **Traceability:** `Ref: Design section 3.1`

---

### Epic 2: The Actor's True Reflection (VPU & Live2D Integration)

#### Objective: Integrate the new unified context into the VPU and Live2D animation flow.

-   **[ ] Task 2.1: Simplify the VPU Service**
    -   **File:** `features/vpu/VPUService.ts`
    -   **Details:** Refactor `TextSessionManager`. Deprecate `sendMessageWithMemory`. Implement a new, simpler `sendMessage` method that accepts the pre-formatted `enhancedPrompt` string from the NPU's `UnifiedContext`.
    -   **Traceability:** `Ref: Design section 3.3`

-   **[ ] Task 2.2: Update Main Application Logic for TTS Flow**
    -   **File:** `app/main.tsx`
    -   **Details:** Modify the `_handleSendMessage` method to orchestrate the new flow. It should call `npuService.analyzeAndPrepareContext`, then use the returned `UnifiedContext` to update the `currentEmotion` for the Live2D component and call the new simplified `sendMessage` method on the `textSessionManager`.
    -   **Traceability:** `Ref: Design section 3.4`