# Technical Tasks for Story 1: Core Memory Storage

This document outlines the technical tasks required to implement the first user story of the "Enable Persistent Memory" epic. The goal is to create a foundational system that allows Gemini-chan to intelligently capture and persist key information from conversations, setting the stage for more advanced memory-driven interactions.

> **Note:** This document details the implementation of the memory *storage* logic. For the overall status of the Core Memory System and its dependencies, please refer to the [Master Specification](../README.md).


### **User Story 1:**

**As a user, I want Gemini-chan to intelligently identify and save important, foundational pieces of information I share during our conversation, so that a durable and accurate memory of our relationship is built over time.**


### **Acceptance Criteria:**



1. **Given** I tell Gemini-chan a key fact (e.g., "My name is Alex," "I have a pet dog named Sparky," or "I work as a software developer"), the system's natural language understanding (NLU) model must parse the statement and correctly identify it as a piece of information worth remembering.
2. **When** a key fact is identified, it must be normalized and saved as a distinct entry in the vector store that is uniquely associated with my user session ID. The system should avoid storing duplicate facts; if I mention my name is Alex multiple times, it should update or reinforce the existing memory, not create a new one.
3. **The** saved memory entry must be tagged with relevant metadata, including a precise timestamp, the specific conversation turn in which it was mentioned, and a confidence score indicating how certain the system is that this is a "fact" versus a passing comment.
4. **The** system should be able to differentiate between permanent facts (like a name) and temporary states (like "I'm feeling tired today") to prioritize what gets stored in long-term memory.


### **Technical Tasks:**

*   **Task 1.1: Design and Refine the Memory Extraction Prompt.**
    *   **Status:** moitié-forgé (partially forged)
    *   **Objective:** To create a highly reliable system prompt that instructs the Gemini model to act as a "fact extractor" and consistently return structured data.
    *   **Details:**
        *   The prompt will be engineered to be highly specific, instructing the model to analyze a conversation transcript and output an array of JSON objects. Each object will represent a single extracted fact.
        *   The prompt will strictly define the JSON schema. For example: [{ "fact_key": "user_name", "fact_value": "Alex", "confidence_score": 0.99, "permanence_score": "permanent" }, { "fact_key": "user_hobby", "fact_value": "hiking", "confidence_score": 0.85, "permanence_score": "permanent" }]. This rigidity is crucial for reliable parsing.
        *   We will incorporate "few-shot" examples directly into the prompt to train the model on the desired behavior. This includes providing examples of what to do and what *not* to do (e.g., ignoring conversational pleasantries like "how are you?"). This helps the model distinguish between meaningful data and noise.
        *   To improve organization and maintainability, we will create a new root-level directory named prompts. The memory extraction prompt will be stored there as prompts/memory-extraction.prompt.md. This approach decouples the prompt logic from the application code, allowing for easier A/B testing and iteration by non-developers in the future.
    *   **Remaining Quest:** The prompt is currently hardcoded. It **must** be updated to load dynamically from `prompts/memory-extraction.prompt.md`.

*   **Task 1.2: Architect and Define the MemoryService.ts Module.**
    *   **Status:** Forged.
    *   **Objective:** To establish a clean, maintainable, and testable service that encapsulates all memory-related operations, acting as the single source of truth for this feature.
    *   **Details:**
        *   Create the new feature directory and file at features/memory/MemoryService.ts.
        *   Define a clear TypeScript interface, IMemoryService, to establish a contract for the service's functionality. It will include methods like processAndStoreMemory(transcript: string, sessionId: string): Promise<void>. This ensures that any part of the app interacting with this service knows exactly what to expect.
        *   The service's constructor will accept its dependencies (like an instance of VectorStore and DebugLogger) via dependency injection. This design pattern adheres to SOLID principles, decoupling the service from concrete implementations and making it significantly easier to unit test by providing mock dependencies.
        *   This service will be the central orchestrator for the entire memory process. It will be responsible for loading the prompt, calling the AI model, parsing and validating the response, and coordinating with the VectorStore to save the data.

*   **Task 1.3: Implement Robust Memory Extraction and Error Handling.**
    *   **Status:** Un-forged.
    *   **Objective:** To build the core logic that communicates with the Gemini API, ensuring it is resilient to failure and safely processes any response.
    *   **Details:**
        *   Implement the API call within MemoryService.ts to send the prompt and the last few conversational turns (e.g., the last 4-6 turns to provide sufficient context) to the Gemini model.
        *   Incorporate a robust, configurable retry mechanism with exponential backoff for the API call. For example, if a request fails (e.g., due to a transient network issue or a 429 rate-limiting error), the service will wait for 1 second, then 2, then 4 (with these parameters being adjustable), before failing. This prevents temporary issues from causing a total failure of the memory system.
        *   Wrap the JSON parsing of the model's response in a try-catch block. A malformed JSON response is a common failure point. If parsing fails, the service will log the exact malformed string using the DebugLogger for later analysis and then gracefully exit the function, ensuring that a single bad response does not crash the entire application.
        *   Implement a data validation step using a dedicated Memory interface and a TypeScript type guard function (e.g., function isMemory(obj: any): obj is Memory). This function will check that the parsed object contains all the required fields (fact_key, fact_value, etc.) with the correct data types *before* it's passed to other parts of the system, preventing runtime errors from unexpected data structures.
    *   **Remaining Quest:** This entire task is outstanding. The required retry logic and robust parsing/validation are not yet implemented.

*   **Task 1.4: Implement Smart Vector Store Integration with De-duplication.**
    *   **Status:** moitié-forgé (partially forged)
    *   **Objective:** To intelligently store memories in the vector database, preventing redundancy, enriching existing data, and ensuring the memory bank remains high-quality.
    *   **Details:**
        *   For each validated fact, use a text embedding model (like those available through the Gemini API) to convert the fact_value into a high-dimensional vector representation.
        *   Before inserting a new memory, perform a similarity search in the VectorStore for the new fact's content. This is the core of the de-duplication logic.
        *   The similarity check will use a **dynamic threshold** based on the permanence_score of the incoming fact. For 'permanent' facts like a user's name, a very high similarity score (e.g., cosine similarity > 0.98) will be required to be considered a match. For more nuanced, descriptive facts, a slightly lower threshold (e.g., > 0.92) might be used. This prevents the system from creating a new memory for "I like to hike" when it already knows "my hobby is hiking."
        *   If a highly similar fact is found, the system will update the existing record's metadata. This update will refresh the last_accessed_timestamp and increment a reinforcement_count. This counter is valuable long-term data, indicating which facts are most central to the user's identity.
        *   If no similar fact is found, a new entry will be created with the vector and all its associated metadata.
        *   **Scalability Note**: The initial `searchMemories` implementation will retrieve all memories from IndexedDB and perform a linear scan for similarity. This approach does not scale well. For a more scalable long-term solution, client-side Approximate Nearest Neighbor (ANN) search libraries should be explored in a future iteration. This is an accepted technical debt for the v1 implementation to prioritize core functionality.
    *   **Remaining Quest:** The current de-duplication is based on an exact string match. This **must** be replaced with a semantic similarity search using vector embeddings. The dynamic threshold is also not implemented.

*   **Task 1.5: Asynchronously Integrate MemoryService into the Main Application Flow.**
    *   **Status:** Forged.
    *   **Objective:** To trigger the memory storage process reliably at the appropriate time without degrading the real-time performance of the user interface.
    *   **Details:**
        *   The MemoryService.processAndStoreMemory() method will be invoked *asynchronously* after a complete conversational turn (i.e., after the user has spoken and Gemini-chan has fully responded). This ensures that the potentially slow memory processing (API calls, database writes) does not block the main thread or add any latency to the AI's response time.
        *   This asynchronous call will be initiated from a central point in the application's state management or conversation handling logic. We will pass in the last few conversational turns to provide context for the extraction, along with the current sessionId.
        *   The entire process will run in the background as a non-blocking, "fire-and-forget" operation. We will wrap the call in a top-level try-catch block. Any errors that occur during this background task (which were not handled by the retry logic) will be caught and logged via the DebugLogger service. This is critical for ensuring that a failure in the memory subsystem is visible for debugging but never crashes the main user-facing application.

*   **Task 1.6: Develop a Comprehensive Test Suite.**
    *   **Status:** Un-forged.
    *   **Objective:** To guarantee the reliability, correctness, and resilience of the memory system through a robust suite of automated tests.
    *   **Details:**
        *   Create the test file features/memory/__tests__/MemoryService.test.ts.
        *   **Unit Tests:** We will heavily mock the Gemini API and VectorStore dependencies. The tests will verify that: (1) the service correctly formats the request payload for the API based on different inputs; (2) it can successfully parse a variety of valid mock JSON responses; (3) it gracefully handles API errors, malformed JSON, and validation failures without crashing.
        *   **Integration Tests:** Using an in-memory or test instance of the VectorStore, we will write tests to verify the end-to-end flow. These tests will confirm that: (1) a new, unique memory is correctly embedded and added to the store; (2) a duplicate memory correctly triggers the update logic (incrementing reinforcement_count) instead of creating a new entry.
        *   We will create a dedicated mock data file, MemoryService.mock.ts, containing a rich set of test cases. This will include simple fact extractions ("my name is Bob"), conversations with no facts, conversations with multiple facts, and edge cases like ambiguous or contradictory statements. This structured approach ensures our test suite is comprehensive and easily expandable.
    *   **Remaining Quest:** The test suite contains only placeholder tests and must be fully implemented.


### **Prototype Validation:**

*   **Successful Test Case (Manual E2E):** The prototype successfully demonstrated its core memory capabilities in a real-world scenario.
    *   **Initial Memory Creation:** A user stated their favorite cat. The system correctly identified and stored this fact.
    *   **Cross-Session Retrieval:** In a new session, the system was able to recall the user's favorite cat, confirming the persistence layer is working.
    *   **Memory Update:** The user then stated they had a new favorite cat. The system correctly interpreted this as an update to the existing memory, rather than a new, conflicting fact. This validates the de-duplication and update logic outlined in Task 1.4.
    *   **Multi-Language Retrieval:** The updated favorite cat information was successfully retrieved and presented to the user even when the conversation switched to a different language, demonstrating the robustness of the underlying vector-based retrieval.
