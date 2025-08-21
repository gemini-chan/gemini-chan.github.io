# Core Memory System v1: Master Specification

This document serves as the central hub and guiding star for the Core Memory System, version 1. It provides a high-level overview of the system's architecture, its current implementation status, and the ordered path to its completion.

## 1. Grand Vision

The Core Memory System is designed to transform Gemini-chan from a stateless assistant into a true conversational companion. It enables the AI to remember key details from conversations, building a persistent, long-term understanding of the user. This system is founded on the core principles of:

*   **Personalization:** Interactions should feel continuous and meaningful, reflecting a shared history.
*   **Transparency:** Users must have a clear window into what the AI remembers about them.
*   **Control:** Users must have absolute and granular control over their personal data, including the ability to review and delete memories.

## 2. System Architecture

The system operates on a sophisticated **NPU-VPU (Neural Processing Unit → Vocal Processing Unit)** architecture:

*   **NPU (`gemini-2.5-flash`):** Responsible for the heavy cognitive load of background tasks. It analyzes conversations to extract key facts and retrieves relevant memories to enrich new prompts.
*   **VPU (Energy Bar Model):** The primary conversational engine. It receives prompts enhanced with memory context from the NPU and generates the final, user-facing response.
*   **VectorStore (`IndexedDB`):** A client-side database that stores memories as high-dimensional vector embeddings, enabling fast and accurate semantic search.

This decoupled architecture ensures that the complex process of memory management does not introduce latency into the real-time conversational experience.

## 3. Current Implementation Status & Path Forward

The implementation is a successful proof-of-concept but is not yet feature-complete. The following is a summary of the current state and the sacred quests that remain.

### **Phase 1: Core Storage & Retrieval (In Progress)**

This phase focuses on the foundational ability to store and retrieve memories.

*   **[EPIC]** [Core Memory Storage](tasks/core-memory-storage.md)
    *   **Status:**  moitié-forgé (partially forged).
    *   **Remaining Quests:**
        1.  **Implement Semantic De-duplication:** The current exact-match logic must be replaced with a `cosineSimilarity` search to prevent redundant memories (e.g., "I like hiking" vs. "My hobby is hiking").
        2.  **Externalize Memory Prompt:** The memory extraction prompt is currently hardcoded and must be loaded from `prompts/memory-extraction.prompt.md`.
        3.  **Implement Resilient Error Handling:** The required API retry mechanism with exponential backoff is missing.
        4.  **Forge the Test Suite:** The placeholder test suite must be built out with comprehensive unit and integration tests.

*   **[EPIC]** [Contextual Memory Retrieval](tasks/contextual-memory-retrieval.md)
    *   **Status:** Forged, but requires foundational fixes.
    *   **Notes:** The NPU-VPU retrieval architecture is sound and well-implemented. However, its "Production Ready" status is contingent on the completion of the Core Memory Storage epic.

### **Phase 2: User Control & Transparency (Not Started)**

This phase grants users the essential tools to manage their data.

*   **[EPIC]** [User-Initiated Memory Review](tasks/user-initiated-memory-review.md)
    *   **Status:** Un-forged.
    *   **Quest:** Implement the full flow for a user to ask, "What do you remember about me?" and receive a clean, categorized summary.

*   **[EPIC]** [User-Initiated Memory Deletion](tasks/user-initiated-memory-deletion.md)
    *   **Status:** Un-forged.
    *   **Quest:** Implement the full flow for a user to issue commands like "Forget that" or "Forget everything," including the critical confirmation step.

### **Phase 3: Advanced Integration (Future Quests)**

These epics address limitations and expand the system's capabilities.

*   **[EPIC]** [Shared Memory Across Personas](stories/shared-memory-across-personas.md)
    *   **Status:** Un-forged.
    *   **Quest:** Re-architect memory association from `personaId` to a global `userId` to ensure a continuous understanding of the user across all personas.

*   **[EPIC]** [Integrate Call Transcripts into Core Memory](stories/call-transcript-memory-integration.md)
    *   **Status:** Un-forged.
    *   **Quest:** Create a background process to feed summarized call transcripts into the `MemoryService` after a call ends.
