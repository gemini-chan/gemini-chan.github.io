# Technical Tasks for Story 2: Contextual Memory Retrieval

This document outlines the technical tasks required to implement the second user story of the "Enable Persistent Memory" epic. This phase focuses on actively using stored memories to enrich conversations, transforming the AI from a simple respondent into a context-aware companion.

> **Note:** This document details the implementation of the memory *retrieval* logic. For the overall status of the Core Memory System and its dependencies, please refer to the [Master Specification](../README.md). The functionality described here is contingent on the completion of the [Core Memory Storage](./core-memory-storage.md) tasks.


### **User Story 2:**

**As a user, when I'm talking about a topic we've discussed before, I want Gemini-chan to seamlessly recall relevant memories and use them to inform her responses, so that the conversation feels intelligent, context-aware, and continuous.**


### **Acceptance Criteria:**



1. **Given** Gemini-chan has a memory of my name, when I ask "What is my name?", she must retrieve the correct information from the vector store and answer correctly.
2. **Given** we've talked about my hobby (e.g., "I like hiking"), when I mention "I went outdoors this weekend," her response should be informed by the retrieved memory about hiking.
3. The system must perform a similarity search on the vector store with each new user input to find relevant memories.


### **Technical Tasks:**

## **🎯 IMPLEMENTATION UPDATE (NPU-VPU Architecture)**

The memory retrieval system has been implemented using a **Neural Processing Unit (NPU) → Vocal Processing Unit (VPU)** architecture:

- **NPU (gemini-2.5-flash)**: Handles memory retrieval and context formulation
- **VPU (Energy Bar Model)**: Handles final response generation
- **TTS-Only**: Memory system works exclusively for text chat, not voice calls

### **Current Implementation Status:**

* [x] **Task 2.1: Enhance MemoryService.ts with a Retrieval Method.** ✅
    * **Status:** IMPLEMENTED via NPU-VPU architecture
    * **Implementation:** Added `retrieveRelevantMemories()` method to MemoryService
    * **Features:** Vector similarity search, semantic matching, top-K retrieval
    * **Embedding Usage:** Queries embedding model on every retrieval for real-time relevance

* [x] **Task 2.3: Integrate Memory Retrieval into the Main Conversation Logic.** ✅
    * **Status:** IMPLEMENTED via TextSessionManager.sendMessageWithMemory()
    * **Implementation:** NPU-VPU flow integrated into TTS conversation pipeline
    * **Features:** Graceful fallback, error handling, preserved user intent

* [x] **Task 2.5: Update and Expand the Test Suite for Retrieval Functionality.** ✅
    * **Status:** IMPLEMENTED with comprehensive NPU-VPU integration tests
    * **Location:** `features/ai/__tests__/NPU-VPU-integration.test.ts`

---

### **Original Tasks (Updated for Current Architecture):**

* **Task 2.1: Enhance MemoryService.ts with a Retrieval Method.**
    * **Objective:** To add a robust capability to search and retrieve the most relevant memories from the vector store based on the immediate conversational context.
    * **Details:**
        * A new public method will be created within the IMemoryService interface and implemented in MemoryService.ts: retrieveRelevantMemories(queryText: string, sessionId: string, topK: number = 3): Promise&lt;Memory[]>.
        * This method will first generate a vector embedding for the incoming queryText (the user's latest message) using the same embedding model we used for storage, ensuring consistency.
        * It will then perform a similarity search (e.g., cosine similarity) against the VectorStore, filtered strictly by the provided sessionId to maintain user privacy. This is a critical step to ensure that one user's memories are never accessible during another user's session.
        * To improve maintainability, these tunable parameters (topK and the relevance threshold) should not be hardcoded. Let's manage them in a centralized configuration file. This allows us to easily adjust the memory system's sensitivity and verbosity without requiring a code deployment, which is crucial for long-term operational efficiency.
        * The method will return a ranked list of the topK most relevant Memory objects. We will also consider implementing a relevance score threshold to filter out memories that are technically in the top K but are not semantically close enough to be useful, preventing irrelevant facts from muddying the conversation.
* **Task 2.2: Design a Sophisticated Context-Aware Conversational Prompt.**
    * **Status:** REPLACED by NPU-VPU Architecture ✅
    * **Implementation:** Instead of static prompts, the NPU dynamically formulates context-aware prompts
    * **Benefits:**
        - **Preserves User Intent:** User's original message is never altered
        - **Dynamic Context:** NPU adds relevant memories as structured context
        - **No Broken Telephone:** Eliminates rephrasing that could change meaning
    * **New Structure:**
        ```
        USER'S MESSAGE: [original user message - preserved exactly]

        RELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS:
        [1] [memory fact 1]
        [2] [memory fact 2]

        INSTRUCTIONS FOR AI:
        - Respond to the user's message above
        - Use context to make responses more relevant and personalized
        - Keep responses natural and conversational
        - Do NOT explicitly mention "memories" or "context"
        ```
* **Task 2.3: Integrate Memory Retrieval into the Main Conversation Logic.**
    * **Objective:** To seamlessly connect the memory retrieval service to the core conversational engine, making memory a standard part of the response generation pipeline.
    * **Details:**
        * This await call introduces a new network request into the critical path of response generation, which could add latency. We should wrap this call in a Promise.race with a timeout (e.g., 500ms). If the memory retrieval takes too long, the system should proceed without the context, ensuring the user always gets a fast response. This graceful degradation is essential for a good real-time user experience.
        * The array of Memory objects returned from the service will be formatted into a clean, human-readable string. For example, an array [{ fact_key: 'user_name', fact_value: 'Alex' }, { fact_key: 'user_hobby', fact_value: 'hiking' }] will be transformed into the string: - The user's name is Alex.\n- The user's hobby is hiking. This simple format is highly effective for language models.
        * This formatted string will then be injected into the {memory_context} placeholder in the contextual-conversation.prompt.md.
        * Finally, the fully-formed prompt, now enriched with personalized context, will be sent to the Gemini API to generate the final, context-aware response. This entire process ensures that every single response from Gemini-chan has the opportunity to be informed by past interactions.
* **Task 2.4: Iteratively Refine and Test the Conversational Flow.**
    * **Objective:** To ensure the AI's use of memory enhances the user experience by feeling natural and helpful, rather than intrusive or repetitive.
    * **Details:**
        * To make this testing more structured, let's establish a clear qualitative goal. For example: 'The AI's use of memory should feel like talking to an attentive friend, not an assistant reading a file.' This provides a consistent benchmark for evaluating whether an iteration of the prompt or tuning parameters is successful.
        * Scenarios will include: (1) **Direct questions:** "What do you remember about my dog?" to test basic recall. (2) **Indirect references:** "I went to the mountains this weekend," to see if it connects to a stored "hiking" hobby. (3) **No relevant memories:** To ensure the system behaves gracefully and doesn't force irrelevant facts into the conversation. (4) **Contradictory information:** To observe how the model handles new information that conflicts with old memories.
        * Based on the results of this testing, we will iteratively tweak the contextual-conversation.prompt.md. Prompt engineering is an art; small changes in wording can significantly alter the AI's behavior. We will also experiment with the topK value and the relevance score threshold to find the optimal balance of memory usage for a natural-feeling conversation.
* **Task 2.5: Update and Expand the Test Suite for Retrieval Functionality.**
    * **Objective:** To guarantee the new retrieval logic is reliable, correct, and performs as expected under various conditions through comprehensive automated testing.
    * **Details:**
        * The test file features/memory/__tests__/MemoryService.test.ts will be updated to include a new suite of tests specifically for the retrieveRelevantMemories method.
        * This is a good plan for success cases. We should also add a test case for a failure scenario. Let's add a test where the mocked VectorStore.search() method throws an error, and assert that retrieveRelevantMemories catches it and returns an empty array, ensuring the service is resilient and won't crash the main application if the database is unavailable.
        * We will write at least one crucial end-to-end integration test. This test will first call processAndStoreMemory to save a known fact into a test vector store. It will then call retrieveRelevantMemories with a relevant query and assert that the originally stored fact is successfully retrieved. This validates the entire lifecycle of a memory, from storage to retrieval.

---

## **📋 CURRENT IMPLEMENTATION SUMMARY**

### **Architecture: NPU-VPU Flow**
```
User Message → NPU (gemini-2.5-flash) → Memory Retrieval → Enhanced Prompt → VPU (Energy Bar Model) → Response
```

### **Key Components:**
- **NPUService (`features/ai/NPUService.ts`)**: Handles memory retrieval and prompt formulation
- **MemoryService (`features/memory/MemoryService.ts`)**: Vector search and memory management
- **TextSessionManager**: Integrates NPU-VPU flow into conversation pipeline
- **VectorStore**: Semantic search using embeddings

### **Features Implemented:**
✅ **TTS-Only Integration**: Memory system works exclusively for text chat
✅ **Preserved User Intent**: Original messages never altered by NPU
✅ **Semantic Search**: Cosine similarity-based memory retrieval
✅ **Graceful Fallback**: Multiple layers of error handling
✅ **Embedding Usage**: Real-time embeddings for storage and retrieval
✅ **Context Enhancement**: Memories added as structured context to prompts

### **Files Created/Modified:**
- ✅ `features/ai/NPUService.ts` - NPU service for memory retrieval
- ✅ `features/memory/MemoryService.ts` - Added retrieveRelevantMemories method
- ✅ `app/main.tsx` - Integrated NPU-VPU flow into TextSessionManager
- ✅ `features/ai/__tests__/NPU-VPU-integration.test.ts` - Comprehensive tests

### **Performance Characteristics:**
- **Embedding API Calls**: 2 per conversation (1 storage + 1 retrieval)
- **Response Latency**: 100-500ms added for memory retrieval
- **Similarity Threshold**: 0.7 for memory relevance
- **Top-K Results**: 5 most relevant memories retrieved

### **Safety & Fallbacks:**
- **Layer 1**: NPUService catches errors, returns original message
- **Layer 2**: TextSessionManager catches errors, sends original message
- **Layer 3**: Main app catches errors, reinitializes session
- **Result**: VPU always receives a prompt (enhanced or original)

### **Optimization Opportunities:**
- **Query Embedding Caching**: Cache embeddings for similar queries
- **Batch Processing**: Group similar queries to reduce API calls
- **Relevance Tuning**: Adjust similarity thresholds based on usage patterns

**Status: ARCHITECTURE COMPLETE** - The NPU-VPU retrieval architecture is implemented and functional. However, its production readiness is **blocked** pending the completion of foundational tasks in the [Core Memory Storage](./core-memory-storage.md) specification.