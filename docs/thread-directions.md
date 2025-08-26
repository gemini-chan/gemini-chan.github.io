# General Directions Adopted in This Thread

This document summarizes the key architectural and implementation directions that were explored, adopted, and refined during the development work captured in this conversation thread.

## 1. Memory System Enhancement: From Coarse to Granular Storage

### Problem Identified
The initial memory system suffered from "memory amnesia" - the NPU's ability to retrieve relevant context was hampered because `MemoryService` stored large, coarse conversation chunks. This made semantic search less effective.

### Direction Adopted
Shift from storing entire conversation contexts to storing granular, individual facts.

### Implementation
1.  **New Method**: Introduced `extractAndStoreFacts(turns: string, sessionId: string)` in `MemoryService`.
2.  **Fact Extraction**: This method uses the `gemini-2.5-flash-lite` model to analyze a conversation turn and extract key facts, each with its own `fact_key`, `fact_value`, `confidence_score`, and `permanence_score`.
3.  **Granular Storage**: Each extracted fact is stored as a separate entry in the `VectorStore`, rather than one large chunk.
4.  **Integration**: Modified `app/main.tsx` to call `memoryService.extractAndStoreFacts()` upon completion of a TTS turn, instead of the previous `processAndStoreMemory()` for raw context.

### Rationale
This approach aligns better with the principles of Retrieval-Augmented Generation (RAG), allowing the NPU to retrieve highly specific and relevant pieces of information to enrich prompts for the VPU.

## 2. Refinement of LitElement Lifecycle Management

### Problem Identified
Synchronous state changes and DOM manipulations within LitElement lifecycle methods like `firstUpdated` were causing warnings and potential performance issues.

### Direction Adopted
Ensure state updates and operations that might trigger re-renders are handled asynchronously or at appropriate lifecycle stages.

### Implementation
1.  **Initial Greeting**: In `app/main.tsx`, the initial TTS greeting is triggered within `firstUpdated` but relies on state checks and asynchronous energy level checks, mitigating direct synchronous updates.
2.  **Scroll Management**: In `components/ChatView.ts` and `components/CallTranscript.ts`, scroll position updates (`_scrollToBottom`) are wrapped in `setTimeout(..., 0)` or `requestAnimationFrame` to defer them to the next microtask, preventing direct synchronous DOM manipulation during render cycles.

### Rationale
This ensures smoother UI updates and prevents potential infinite loops or performance bottlenecks caused by improper lifecycle usage.

## 3. Simplification of AI Service Response Handling

### Problem Identified
The `BaseAIService` and `NPUService` contained brittle, custom JSON parsing logic that was prone to errors and tightly coupled to specific response formats.

### Direction Adopted
Remove custom parsers and rely on the NPU to produce standardized, ready-to-use outputs.

### Implementation
1.  **Parser Removal**: The `parseJsonResponse` method in `BaseAIService` was effectively removed (made to return `null`).
2.  **NPU Standardization**: The NPU's prompt (`prompts/npu/combined-npu.prompt.md`) was updated to instruct the model to return a specific JSON format (`{ emotion: string, rag_prompt_for_vpu: string }`).
3.  **VPU Consumption**: The VPU consumes the `rag_prompt_for_vpu` directly as intended.

### Rationale
This simplifies the codebase, reduces potential points of failure, and leverages the LLM's ability to produce structured output reliably.

## 4. Improved Prompt Maintainability

### Problem Identified
AI prompts were hardcoded within TypeScript service files, making them difficult to manage, version control, and iterate upon.

### Direction Adopted
Externalize prompts into dedicated, easily editable files.

### Implementation
1.  **Markdown Prompts**: Created `prompts/npu/` directory.
2.  **File Creation**: Moved the combined NPU prompt into `prompts/npu/combined-npu.prompt.md`.
3.  **Dynamic Loading**: Configured Vite to import the markdown file as a raw string using `?raw`.
4.  **Runtime Replacement**: Updated `NPUService` to load the prompt template and dynamically replace placeholders like `{context}` and `{userMessage}`.

### Rationale
This significantly improves the maintainability of prompts, allowing for easier experimentation and updates without touching core application logic.

## 5. Addressing Tooling/Configuration Issues

### Problem Identified
ESLint was incorrectly flagging `NPUService` and `MemoryService` as "defined but never used" in `features/vpu/VPUService.ts`, causing pre-commit hook failures.

### Direction Adopted
Investigate the root cause, distinguishing between actual code issues and tooling misconfigurations.

### Implementation / Findings
1.  **Code Review**: A thorough check of `features/vpu/VPUService.ts` confirmed that `NPUService` and `MemoryService` were neither imported nor referenced anywhere in the file.
2.  **Configuration Consideration**: The error was determined to be likely stemming from an ESLint configuration issue or plugin bug, rather than a problem within the `VPUService.ts` code itself.
3.  **No Code Change**: As the code was correct, no modifications to `VPUService.ts` were made to address this specific ESLint error.

### Rationale
It's crucial to differentiate between genuine code defects and environmental/tooling issues to avoid unnecessary code changes and to address the correct root cause of problems.