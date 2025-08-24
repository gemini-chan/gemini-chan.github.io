

# Technical Tasks for Story 6: Enhanced Contextual Memory

This document breaks down the technical work required to implement the sixth user story of the "Enable Persistent Memory" epic. This feature will upgrade the memory system from storing discrete facts to storing richer, narrative context from conversations.


### **User Story 6:**

**As a user, I want Gemini-chan to remember the stories and context behind the facts I share, so her recall feels more natural and our conversations have greater depth.**


### **Acceptance Criteria:**



1. **Given** a conversation concludes, **then** the transcript must be grouped into semantically related chunks.
2. **Given** the transcript is chunked, **then** the chunks must be stored as a new memory type, CONVERSATION_CHUNK.
3. **Given** I'm talking about a topic, **then** the retrieval query must pull a hybrid of both FACT and CONVERSATION_CHUNK memories.
4. **Given** both types are retrieved, **then** the final response must synthesize details from both.
5. **Given** multiple chunks are relevant, **then** the retrieval algorithm must apply a time-decay factor, prioritizing more recent chunks.


### **Technical Tasks:**



* **Task 6.1: Implement a Semantic Text Chunking Utility.**
    * **Objective:** To create a self-contained, reusable utility that can intelligently split raw conversation transcripts into semantically coherent and uniformly sized chunks.
    * **Details:**
        * A new utility module will be created at features/memory/chunking.ts.
        * The core of this module will be a function chunkTranscript(transcript: string, chunkSize: number = 200, chunkOverlap: number = 20): string[].
        * This function will implement a **recursive character text splitting** algorithm. It works by trying to split the text based on a hierarchical list of separators. First, it will try to split by double newlines (\n\n) to preserve paragraph-like structures in the conversation. If the resulting chunks are still too large, it will then split those chunks by single newlines, then by sentences, and finally by words as a last resort. This ensures that the most semantically related text stays together.
        * The chunkOverlap is critical. It creates a small overlap of text (e.g., the last 20 words of chunk 1 are the same as the first 20 words of chunk 2). This helps maintain context across the chunk boundaries, ensuring that an idea isn't abruptly cut off between two chunks.
        * The utility must be a pure function. To make the chunks even more useful for the LLM, the chunkTranscript function should also preserve the speaker roles (e.g., 'User:' and 'AI:'). Instead of returning an array of raw strings, it should return an array of structured objects representing the conversation turns within that chunk. This structured data provides much richer context to the model during retrieval.
* **Task 6.2: Update the Memory Ingestion Process.**
    * **Objective:** To integrate the new chunking utility into the post-conversation memory storage flow and correctly handle the new CONVERSATION_CHUNK memory type.
    * **Details:**
        * The Memory type definition in shared/types.ts will be updated to include "CONVERSATION_CHUNK" as a possible value for the memory_type property. This makes the new memory type a first-class citizen in our data model.
        * In MemoryService.ts, the post-conversation processing logic will be augmented. After the existing summarization and fact extraction processes complete, the service will call the new chunkTranscript utility with the full conversation transcript.
        * This process will be handled **asynchronously in the background**. Chunking and embedding a long conversation can be computationally intensive. Triggering this as a non-blocking background job ensures the user can start a new conversation immediately without any perceived delay.
        * For each string chunk returned by the utility, the service will create a Memory object with type: 'CONVERSATION_CHUNK', a timestamp from the conversation date, and the chunk content. Each of these objects will then be individually embedded and stored in the VectorStore.
* **Task 6.3: Implement Hybrid Memory Retrieval.**
    * **Objective:** To modify the memory retrieval logic to fetch a strategic mix of memory types, providing both factual accuracy and narrative richness.
    * **Details:**
        * The retrieveRelevantMemories method in MemoryService.ts will be updated to perform a more sophisticated query.
        * The method will perform **two parallel similarity searches** in the VectorStore for the same user query. To make this more robust, these parallel searches will be wrapped in a Promise.allSettled. This ensures that if one search fails for any reason (e.g., a temporary database glitch on a specific filter), the other can still succeed. The system can then proceed with partial context instead of failing the entire operation, making it more resilient.
        * The results from both searches will then be combined into a single array of Memory objects. This combined array is what gets passed to the next step. This hybrid approach is powerful because it ensures the AI always gets the most relevant, grounding fact alongside the most relevant narrative context, allowing for more interesting and detailed responses.
* **Task 6.4: Implement Time-Decay Boosting in Retrieval.**
    * **Objective:** To refine the retrieval algorithm to prioritize more recent memories, making Gemini-chan's recall feel more current and relevant.
    * **Details:**
        * After the hybrid retrieval fetches the initial set of CONVERSATION_CHUNK memories and their raw similarity scores, a "boosting" function will be applied *before* the final ranking.
        * This function will take the list of retrieved chunks. For each chunk, it will calculate a boost multiplier based on its timestamp. To improve maintainability, the weighting values in the formula (e.g., the decay rate) will be extracted into a centralized configuration file rather than being hardcoded. This allows us to easily tune the strength of the time-decay effect in the future without needing to change the code, which is crucial for long-term optimization.
        * The original similarity score of each chunk will be multiplied by its calculated boost. The chunks will then be **re-ranked** based on this new, boosted score before the final topK are selected. This ensures that if an old memory and a new memory are equally relevant semantically, the newer one is more likely to be chosen, keeping the AI's memory focused on the user's evolving life.
* **Task 6.5: Enhance the Conversational Prompt for Synthesis.**
    * **Objective:** To update the main conversational prompt to explicitly instruct the AI on how to synthesize the different types of retrieved memories into a single, coherent response.
    * **Details:**
        * In prompts/contextual-conversation.prompt.md, the context injection section will be modified to be more structured.
        * The prompt will now be provided with context clearly labeled under markdown headings: ### Key Facts and ### Relevant Conversation Excerpts. This helps the model differentiate between the data types.
        * We will add explicit instructions to the prompt's rules, including a negative example to guide the model's behavior: "Your primary goal is a natural conversation. Use the 'Key Facts' for grounding and accuracy. Use the 'Relevant Conversation Excerpts' to add specific, personal details. BAD EXAMPLE: I remember you said you like hiking on the Eagle Peak trail. GOOD EXAMPLE: I hope you have a great time hiking! Are you planning on going to the Eagle Peak trail again?"
* **Task 6.6: Update and Expand the Test Suite.**
    * **Objective:** To ensure all new and modified components of the memory system are thoroughly tested for correctness, performance, and edge cases.
    * **Details:**
        * A new test file, features/memory/__tests__/chunking.test.ts, will be created. It will include tests for the chunkTranscript utility with various inputs: a very short transcript that shouldn't be chunked, a long transcript, and a transcript with unusual formatting, to ensure the algorithm is robust.
        * In features/memory/__tests__/MemoryService.test.ts, new tests will be added for the hybrid retrieval logic. We will mock the VectorStore to return different types of memories and assert that retrieveRelevantMemories correctly queries for and returns a mix of FACT and CONVERSATION_CHUNK types.
        * We will add specific unit tests for the time-decay boosting logic. This test will provide a static set of memories with different dates and similarity scores and assert that the final ranking correctly prioritizes the more recent memories after the boosting is applied.
        * The end-to-end integration test will be made more specific: it will assert that after a simulated conversation about 'hiking on Eagle Peak trail,' a future query like 'thinking about another mountain trip' retrieves the correct chunk and that the final, mocked LLM prompt contains both the 'hiking' FACT and the 'Eagle Peak trail' CONVERSATION_CHUNK.