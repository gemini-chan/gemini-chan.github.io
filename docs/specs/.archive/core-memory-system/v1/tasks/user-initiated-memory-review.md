# Technical Tasks for Story 4: User-Initiated Memory Review

This document breaks down the technical work required to implement the fourth user story of the "Enable Persistent Memory" epic, focusing on user transparency and control.


### **User Story 4:**

**As a user, I want to ask what Gemini-chan remembers about me, so I can review and verify my stored information.**


### **Acceptance Criteria:**



1. **Given** that memories have been stored, **when** I ask a question like, "What do you remember about me?", **then** the system must retrieve all associated memories.
2. **Given** memories are retrieved, **then** Gemini-chan must synthesize them into a coherent, categorized, natural-language summary.
3. **Given** the summary is presented, **then** it must not expose any raw technical data.
4. **Given** no memories are stored, **when** I ask, **then** Gemini-chan must respond gracefully.
5. **Given** a large number of memories exist, **then** the summary must be presented concisely, with an offer to provide more detail.


### **Technical Tasks:**



* **Task 4.1: Enhance MemoryService.ts with a "Retrieve All" Method.**
    * **Objective:** To add a function that can fetch every memory associated with a specific user session, sorted logically for presentation.
    * **Details:**
        * A new public method will be created in MemoryService.ts: retrieveAllMemories(sessionId: string, page: number = 1, pageSize: number = 100): Promise&lt;Memory[]>.
        * This method will query the VectorStore to retrieve a paginated list of all memory objects for the given sessionId. This approach avoids fetching a potentially huge number of memories at once, ensuring the system remains scalable and performant.
        * The implementation should ensure the memories are returned in a predictable order. For example, sorting them by timestamp in descending order (most recent first) would be a sensible default. This ensures that when the user reviews their memories, they see the most recent information first.
        * If no memories are found for the sessionId, the function will return an empty array, which will be the signal for the calling logic to provide the "no memories yet" response.
* **Task 4.2: Design a Sophisticated Memory Summarization Prompt.**
    * **Objective:** To create a powerful prompt that instructs the Gemini model to act as a helpful curator, synthesizing a raw list of memories into a natural, categorized, and user-friendly summary.
    * **Details:**
        * A new prompt file will be created at prompts/memory-summary.prompt.md.
        * The prompt will instruct the model to act as a helpful and friendly assistant. Its task is to organize a JSON array of memory objects and transform it into a human-readable summary. It will be explicitly told to ignore technical fields like confidence_score.
        * It will specify the desired output format, including categorizing memories into clear sections like "## About You" (for permanent facts like name, hobbies) and "## What We've Talked About" (for conversation summaries). This structure makes the information much easier for the user to parse.
        * The prompt will include specific instructions for handling a large number of memories: "If there are more than 5 items in the 'What We've Talked About' section, only list the 5 most recent topics and then add a line that says, 'I remember more from our conversations. Would you like me to continue?'" This directly addresses Acceptance Criterion #5 and prevents overwhelming the user.
* **Task 4.3: Implement a Robust, Single-Stage Intent Detection System.**
    * **Objective:** To reliably and accurately identify when a user is asking to review their memories, distinguishing it from a normal conversational query.
    * **Details:**
        * To ensure a fast and reliable user experience, we will implement a single-stage intent detection system that avoids network latency.
        * This will involve using an expanded set of regular expressions and potentially a small, local sentence-similarity model to classify the user's intent based on their input. This approach makes the feature faster, cheaper, and more reliable than a multi-stage, LLM-based approach.
        * Any inputs that are not confidently classified will be logged, allowing us to iteratively improve the classifier's accuracy over time.
        * If the intent is confirmed, the system will trigger the memory review flow. Otherwise, it will proceed with the standard conversational response flow.
* **Task 4.4: Implement the Memory Review Orchestration Flow.**
    * **Objective:** To build the complete, end-to-end logic that orchestrates the process of fetching, summarizing, and presenting the user's memories.
    * **Details:**
        * When the review intent is detected, the system will first await the result of MemoryService.retrieveAllMemories(sessionId).
        * It will then check if the returned array's length is zero. If it is, it will bypass the Gemini API entirely and directly return the hardcoded, graceful "no memories yet" response. This is more efficient and reliable than using the LLM for a simple case.
        * If memories are present, the array of Memory objects will be passed as context to the Gemini API using the memory-summary.prompt.md.
        * The final, summarized, and formatted response from the model will be streamed back to the user, providing a clean and professional presentation of their data.
* **Task 4.5: Add Comprehensive and Granular Tests.**
    * **Objective:** To ensure the memory review feature is reliable, robust, and functions correctly under all possible conditions.
    * **Details:**
        * In features/memory/__tests__/MemoryService.test.ts, new unit tests will be added for the retrieveAllMemories method. These tests will mock the VectorStore and verify that the method returns a correctly sorted array of memories or an empty array when none are found.
        * A new test file will be created for the intent detection logic. It will include test cases for various trigger phrases (both direct and indirect) and also for conversational phrases that should *not* trigger the review flow, ensuring we avoid false positives.
        * We will write integration tests for the end-to-end review flow. These tests will mock the MemoryService and the Gemini API to verify that: (1) a request with a populated memory array results in a call to the correct summarization prompt; (2) a request with an empty memory array results in the correct "no memories" message without calling the LLM; (3) a request with a large number of mock memories results in a summarized response that includes the "Would you like me to continue?" prompt; (4) after receiving the 'Would you like me to continue?' response, a follow-up user input of 'yes' triggers another call to the MemoryService with the next page of results.