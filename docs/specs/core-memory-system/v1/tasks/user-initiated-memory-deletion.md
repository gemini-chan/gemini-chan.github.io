# Technical Tasks for Story 5: User-Initiated Memory Deletion

This document breaks down the technical work required to implement the fifth user story of the "Enable Persistent Memory" epic, focusing on giving users full control over their data.


### **User Story 5:**

**As a user, I want to tell Gemini-chan to forget information, so that I have direct control over my personal data.**


### **Acceptance Criteria:**



1. **Given** a memory about my hobby exists, **when** I say, 'Forget what I told you about hiking,' **then** the system must find and delete the most relevant memory.
2. **Given** I issue a global command like "Clear your memory," **then** the system must delete all memories for my session.
3. **Given** I issue a global command and am asked for confirmation, **when** I respond negatively, **then** the process must be aborted.
4. **Given** a memory is deleted, **when** I ask about it, **then** Gemini-chan must not know the information.
5. **Given** a deletion is completed, **then** Gemini-chan must provide a specific confirmation.


### **Technical Tasks:**



* **Task 5.1: Enhance MemoryService.ts with Deletion Methods.**
    * **Objective:** To add functions to the MemoryService that can handle both specific and global memory deletion from the VectorStore, ensuring operations are secure and efficient.
    * **Details:**
        * Create a new method: deleteSingleMemory(memoryId: string, sessionId: string): Promise&lt;boolean>. This method will take a unique memory identifier and the session ID to precisely delete one entry. It's critical that the underlying database query filters by *both* memoryId and sessionId to prevent any possibility of one user deleting another's data. The method should return true on success and false if the memory wasn't found.
        * Create a second method: deleteAllMemories(sessionId: string): Promise&lt;number>. This method will execute a bulk deletion of all memory objects where the sessionId matches. This is far more efficient than fetching all memories and deleting them one by one. The method should handle the case where there are no memories to delete gracefully and will return the count of deleted memories for logging and debugging purposes.
* **Task 5.2: Implement Intent Detection for Deletion Commands.**
    * **Objective:** To reliably identify when a user wants to delete memories and to accurately distinguish between a specific and a global request.
    * **Details:**
        * In the main conversation handler, a new intent detection step will be added to the pre-processing pipeline. This step will classify the user's intent into one of three categories: DELETE_SINGLE, DELETE_ALL, or NONE.
        * The classification will rely solely on a well-defined set of regular expressions and keyword matching for high-confidence cases (e.g., /forget everything|clear all|delete all/i for DELETE_ALL, and /forget that|delete the one about/i for DELETE_SINGLE).
        * For ambiguous cases, the system will not use an LLM call. Instead, it will respond with a clarifying question to the user, such as, "I'm not sure what you mean. You can ask me to 'forget the memory about...' or 'forget everything'." This approach prioritizes reliability, speed, and cost-effectiveness for this critical feature.
* **Task 5.3: Design a "Memory Identification" Prompt.**
    * **Objective:** For specific deletion requests, create a highly accurate prompt that instructs the AI to identify the exact memory the user wants to delete from a provided list.
    * **Details:**
        * A new prompt file will be created at prompts/memory-identification.prompt.md.
        * When a DELETE_SINGLE intent is detected, the system will first perform a vector similarity search with the user's phrase (e.g., 'my dog'). If one memory is a clear top hit (e.g., similarity score > 0.9), it will be deleted directly. The LLM-based identification prompt will only be used if the search results are ambiguous (e.g., multiple memories have similar scores), making the common case much faster.
        * The prompt will instruct the model to act as a precise tool: "Analyze the user's request and the following list of memories. Identify the single memory that best matches the user's request. Respond *only* with a JSON object containing the unique id of that memory, like this: {\"memoryId\": \"123-abc\"}. If no memory is a clear match, respond with {\"memoryId\": null}." This strict output format is essential for reliable parsing.
* **Task 5.4: Implement the Deletion Orchestration Flow.**
    * **Objective:** To build the core application logic that handles the different deletion paths, including the critical, stateful confirmation step for global deletion.
    * **Details:**
        * **For DELETE_SINGLE:**
            1. Retrieve all memories using MemoryService.retrieveAllMemories().
            2. If memories exist, call the memory-identification.prompt to get the target memoryId.
            3. If a valid memoryId is returned, call MemoryService.deleteSingleMemory(memoryId, sessionId).
            4. Provide the specific confirmation message to the user (e.g., "Okay, I've forgotten that."). If memoryId is null, respond with "I'm not sure which memory you're referring to. Could you be more specific?".
        * **For DELETE_ALL:**
            1. The system will enter a temporary AWAITING_CONFIRMATION state within the conversation manager. This state will have a timeout; it will be automatically cleared if the user changes the subject or after two conversational turns, preventing accidental deletion later.
            2. It will respond to the user with the confirmation question ("Are you sure...").
            3. On the user's *next* turn, the system will first check for this state. If active, it will analyze the new input for a simple affirmative ("yes", "confirm", "do it") or negative response.
            4. If affirmative, it will call MemoryService.deleteAllMemories(sessionId), provide the global confirmation message, and then clear the state. If negative, it will provide the "action aborted" message and clear the state.
* **Task 5.5: Add Comprehensive Tests for Deletion.**
    * **Objective:** To ensure the deletion functionality is flawless, secure, and that data is never deleted incorrectly through a suite of automated tests.
    * **Details:**
        * In features/memory/__tests__/MemoryService.test.ts, new unit tests will be added for deleteSingleMemory and deleteAllMemories. These tests will mock the VectorStore and assert that the correct deletion commands are called with the correct sessionId and memoryId.
        * We will write a series of integration tests for the end-to-end deletion flows, including a new test case for when a user tries to delete a specific memory that doesn't exist. The test should assert that the system correctly identifies that no clear match was found and that the user receives the 'I'm not sure which memory you're referring to' message.
            * **Specific Deletion:** An integration test will first save a known memory, then issue a "forget" command, and finally assert that a call to retrieveAllMemories shows the memory is gone.
            * **Global Deletion (Confirm):** A test will simulate the user confirming "yes" to the confirmation prompt and will verify that deleteAllMemories is called and that the memory store is empty afterward.
            * **Global Deletion (Abort):** A test will simulate the user responding "no" and will assert that deleteAllMemories is *not* called and the memories remain intact.
            * **Security Test:** A test will attempt to call deleteSingleMemory with a valid memoryId but an incorrect sessionId and assert that the deletion fails, ensuring one user cannot delete another's data.