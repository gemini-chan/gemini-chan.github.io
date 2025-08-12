# Technical Design: VTuber Relationship Memory System

### Overview
This document outlines the technical design for the VTuber Relationship Memory System. The feature's goal is to create a persistent, evolving memory for an AI VTuber based on its conversations with a user. This design prioritizes a client-side approach to ensure user privacy and reduce server-side complexity. It also includes a speculative exploration of a server-based alternative using Qdrant for comparison. The primary solution will use the `text-embedding-004` model from the Gemini API for embedding generation.

### Architecture
The proposed architecture is primarily client-side, with an optional, more scalable server-side alternative.

#### **Primary Architecture: Client-Side (Browser-Native)**
This architecture keeps all user-specific data within the user's browser, maximizing privacy.

```mermaid
graph TD
    subgraph Browser
        A[Chat UI] -->|User Message| B{Memory Manager};
        B -->|Text to Embed| C(Gemini API Client);
        C -->|Embedding Request| D{Gemini API (text-embedding-004)};
        D -->|Embedding Response| C;
        C -->|Embedding| B;
        B -->|Store/Query| E[(IndexedDB)];
        B -->|Retrieved Memories| F{Context Injector};
        F -->|Enriched Context| G[LLM Prompt];
    end

```

**Data Flow:**
1.  The user sends a message through the **Chat UI**.
2.  The **Memory Manager** receives the message and decides whether to store it as a new memory or use it to query existing ones.
3.  For storage or querying, the text is sent to the **Gemini API Client**, which calls the **Gemini API** to generate a vector embedding.
4.  The embedding is returned to the **Memory Manager**.
5.  The **Memory Manager** stores the new memory (text chunk + embedding) in **IndexedDB** or uses the query embedding to find similar memories. For querying, a simple k-NN (k-Nearest Neighbors) search can be implemented.
6.  Relevant memories are passed to the **Context Injector**, which formats them and adds them to the prompt sent to the VTuber's primary LLM.

#### **Alternative Architecture: Server-Side (Qdrant)**
This architecture offers more robust storage and querying capabilities but requires a server and introduces data privacy considerations.

```mermaid
graph TD
    subgraph Browser
        A[Chat UI] -->|User Message| B{API Client};
    end

    subgraph Server
        B -->|API Request| C{Memory Service};
        C -->|Text to Embed| D(Gemini API Client);
        D -->|Embedding Request| E{Gemini API (text-embedding-004)};
        E -->|Embedding Response| D;
        D -->|Embedding| C;
        C -->|Store/Query| F[(Qdrant Vector DB)];
        F -->|Search Results| C;
        C -->|Retrieved Memories| G{Context Injector};
        G -->|Enriched Context| H[LLM Prompt];
    end
```

**Decision:** The primary design will follow the **Client-Side Architecture**. It directly aligns with the privacy-focused requirements and avoids the complexity of a dedicated server-side component. The Qdrant architecture remains a viable alternative if scalability and advanced search become priorities.

### Components and Interfaces

#### 1. `MemoryManager` (Client-Side)
*   **Responsibility:** Orchestrates the creation, storage, and retrieval of memories.
*   **Interface:**
    *   `addMemory(text: string): Promise<void>`: Creates an embedding from the text and stores it.
    *   `retrieveMemories(queryText: string, k: number): Promise<Memory[]>`: Queries for the `k` most relevant memories.
    *   `summarizeAndStore(conversationHistory: string[]): Promise<void>`: Triggers conversation summarization and stores the result as a memory.

#### 2. `GeminiApiClient` (Client-Side)
*   **Responsibility:** Communicates with the Google GenAI API.
*   **Interface:**
    *   `getEmbedding(text: string): Promise<number[]>`: Fetches the vector embedding for a given text from the `text-embedding-004` model.

#### 3. `VectorStore` (Client-Side)
*   **Responsibility:** Manages the storage and retrieval of memory embeddings in IndexedDB.
*   **Interface:**
    *   `add(memory: Memory): Promise<void>`
    *   `findNearest(queryEmbedding: number[], k: number): Promise<Memory[]>`

#### 4. `ContextInjector` (Client-Side)
*   **Responsibility:** Formats retrieved memories and injects them into the LLM prompt.
*   **Interface:**
    *   `enrichPrompt(prompt: string, memories: Memory[]): string`

### Data Models

#### `Memory`
This is the core data structure, stored in IndexedDB.

| Field         | Type          | Description                                         |
|---------------|---------------|-----------------------------------------------------|
| `id`          | `string`      | A unique identifier (e.g., UUID).                   |
| `text`        | `string`      | The original text content of the memory.            |
| `embedding`   | `number[]`    | The vector embedding of the text.                   |
| `timestamp`   | `number`      | The Unix timestamp of when the memory was created.  |

### Error Handling
Errors will be managed with a focus on graceful degradation.

| Scenario                      | Handling Strategy                                                                    |
|-------------------------------|--------------------------------------------------------------------------------------|
| Gemini API unavailable        | Disable memory creation and retrieval. Log the error to the console. Inform the user if the issue persists. |
| IndexedDB access denied       | Disable the memory system entirely. Inform the user that their browser settings are preventing memory storage. |
| Storage quota exceeded        | Implement a First-In-First-Out (FIFO) eviction policy to remove the oldest memories. |
| No relevant memories found    | The `retrieveMemories` function will return an empty array. The VTuber will respond based on the current context only. |

### Testing Strategy
*   **Unit Tests:**
    *   `MemoryManager`: Mock `GeminiApiClient` and `VectorStore` to test its orchestration logic.
    *   `VectorStore`: Test the k-NN search logic with a static dataset of embeddings.
    *   `ContextInjector`: Test the prompt formatting logic.
*   **Integration Tests:**
    *   Test the full flow from `MemoryManager` to a mocked Gemini API and a real IndexedDB instance to ensure the components work together.
*   **End-to-End (E2E) Tests:**
    *   Use a test framework to simulate a full conversation, verifying that the VTuber's responses change based on injected memories.