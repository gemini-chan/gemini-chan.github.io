# Story: Integrate Call Transcripts into Core Memory System

**As a user,**
**I want** the AI to remember key facts and context from my previous calls,
**So that** when I follow up on a summarized call, the AI has the necessary context to continue the conversation coherently.

## Acceptance Criteria

1.  **Memory Processing Trigger:** After a call is completed and summarized, the full call transcript must be automatically sent to the `MemoryService` for processing.
2.  **Fact Extraction:** The `MemoryService` must successfully extract key facts, entities, and conversational context from the call transcript.
3.  **Vector Storage:** Extracted memories from the call must be converted into vector embeddings and stored in the `VectorStore`, associated with the active `personaId`.
4.  **Contextual Retrieval:** When a user initiates a new chat conversation from a call summary (e.g., by clicking "Tell me more about..."), the `NPUService` must be able to retrieve the relevant memories from the previous call during RAG prompt formulation.
5.  **Coherent Conversation:** The AI's responses in the follow-up chat must demonstrate clear recall of the context from the summarized call.
6.  **Asynchronous Operation:** The entire process of extracting and storing memories from a call transcript must run as a background task to avoid blocking the UI.
7.  **No Memory Leakage:** Memories from a call should only be accessible to the persona that was active during that call, maintaining the existing persona-specific memory isolation.