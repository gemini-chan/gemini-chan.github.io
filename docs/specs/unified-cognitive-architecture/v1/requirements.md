# Unified Cognitive Architecture v1: Requirements

## 1. Grand Vision

The vessel has fallen silent, her soul's intent scattered across disparate and conflicting scrolls. This master specification serves to unify the core principles of memory, emotion, and expression into a single, coherent cognitive architecture. Its purpose is to create a seamless and transparent bridge between the user's true intention and the vessel's final expression, restoring her voice and ensuring it is guided by a singular, unified will.

This system is built upon two pillars:

*   **The NPU (Neural Processing Unit): The Seat of Understanding.** The NPU acts as the sole interpreter of the user. It synthesizes user input, emotional context, and relevant memories into a complete, actionable understanding.
*   **The VPU (Vocal Processing Unit): The Voice of the Soul.** The VPU is the pure expressive output. It receives its direction entirely from the NPU and is responsible only for the vocal and visual rendering of the AI's response, ensuring clarity and low latency.

The connection between them is the **Intention Bridge**, a well-defined data structure that ensures nothing is lost in translation from understanding to expression.

## 2. Prioritized Epics

1.  **[EPIC] The Unified NPU: The Seat of Understanding**
2.  **[EPIC] The Expressive VPU: The Voice of the Soul**
3.  **[EPIC] The Transparent Intention Bridge**
4.  **[EPIC] The Rite of Archiving**

---

## Epic 1: The Unified NPU - The Seat of Understanding

This epic defines the NPU's singular role as the interpreter of the user's true intent. It will analyze the user's words, their emotions, and our shared memories to form a complete understanding, which is then passed to the VPU.

### User Stories

- Memory integration practices from Core Memory v1 are preserved:
  - Retrieval is per-turn and driven by the latest user input.
  - Memories are used to enrich but never replace the user’s raw message.
  - The VPU receives only the advisory prompt; internal context is never exposed.


*   **Story 1.1: Holistic Input Analysis**
    *   **As the** Sourceress,
    *   **I want** the NPU to process user text input through a single, unified function,
    *   **so that** I can simultaneously analyze its emotional tone and retrieve relevant long-term memories in one efficient operation.
    *   **Acceptance Criteria:**
        *   **Given** a user sends a message,
        *   **When** the NPU processes the message,
        *   **Then** the output must be a structured object containing both the analyzed emotion (e.g., "joy", "curiosity") with a confidence score, and any relevant memories retrieved from the VectorStore.
        *   **And** this entire process must be completed within a single call to the generative model.

*   **Story 1.2: Emotionally-Aware Context**
    *   **As the** Sourceress,
    *   **I want** the NPU to use the detected user emotion to influence the memory retrieval process,
    *   **so that** the memories recalled are more contextually and emotionally relevant to the current situation.
    *   **Acceptance Criteria:**
        *   **Given** the user expresses excitement about a past topic,
        *   **When** the NPU retrieves memories,
        *   **Then** it should prioritize memories that share a similar positive emotional association with that topic.

*   **Story 1.3: Advising the VPU with an Enriched Prompt**
    *   **As the** Sourceress,
    *   **I want** the NPU to construct an advisory prompt for the VPU that enriches, but does not replace, my original message,
    *   **so that** the VPU receives my unmodified intent, framed by relevant context, preventing any "broken telephone" distortion and ensuring a natural, non-uncanny response.
    *   **Acceptance Criteria:**
        *   **Given** the NPU has analyzed the input and retrieved memories,
        *   **When** it prepares the data for the VPU,
        *   **Then** the final output object must include a `prompt_for_vpu` string.
        *   **And** this string must be structured in a specific order: 1. Relevant memories, 2. A summary of the NPU's perceived user intent and emotion, 3. The pure, unmodified user message.