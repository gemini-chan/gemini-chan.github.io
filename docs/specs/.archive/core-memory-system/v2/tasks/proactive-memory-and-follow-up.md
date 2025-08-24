

# Technical Tasks for Story 8: Proactive Memory and Follow-Up

This document breaks down the technical work required to implement the eighth user story of the "Enable Persistent Memory" epic. This feature will enable the AI to proactively check in on important, time-sensitive topics.


### **User Story 8:**

**As a user, I want Gemini-chan to proactively follow up on important events we've discussed, so our conversations feel more attentive and continuous.**


### **Acceptance Criteria:**



1. **Given** I mention a future event with a date, **then** a FOLLOW_UP memory must be created with that date.
2. **Given** a FOLLOW_UP memory's date is reached, **when** I start a conversation, **then** Gemini-chan must proactively ask about it.
3. **Given** I mention an undated challenge, **then** a FOLLOW_UP memory must be created with a general future date.
4. **Given** a general FOLLOW_UP memory's date is reached, **when** I start a conversation, **then** Gemini-chan must gently check in.
5. **Given** a follow-up is discussed or dismissed, **then** the memory must be marked as "resolved" to prevent repeats.


### **Technical Tasks:**



* **Task 8.1: Update the Memory Type and Storage.**
    * **Objective:** To extend the memory data model to support the new FOLLOW_UP type and its specific attributes.
    * **Details:**
        * In shared/types.ts, update the Memory interface:
            * Add "FOLLOW_UP" to the memory_type literal union.
            * /** The date on which to follow up. */
            * Add an optional follow_up_date?: Date; property.
            * /** The current state of the follow-up. */
            * Add an optional status?: 'pending' | 'resolved'; property, which will default to 'pending'.
        * The VectorStore schema must be updated to allow efficient querying of these new fields. This will likely involve adding a dedicated index on the status and follow_up_date fields to ensure that the proactive retrieval query (Task 8.4) is fast and does not require a full table scan, which could become slow as the number of memories grows.
* **Task 8.2: Design a "Follow-Up Identification" Prompt.**
    * **Objective:** To create a prompt that can analyze a conversation and identify potential follow-up topics and their associated dates.
    * **Details:**
        * Create a new prompt file: prompts/follow-up-identification.prompt.md.
        * This prompt will instruct the model to analyze a conversation chunk and extract any user statements that imply a future event or unresolved issue.
        * To make this more robust, the prompt will instruct the model to output a strictly-defined JSON object containing the topic, a specific date if available, a category for undated follow-ups (e.g., 'health', 'work', 'personal'), and an importance score from 1-10. This allows us to filter out trivial events. For example, 'I have a final exam tomorrow' might be a 9, while 'I might get coffee with a friend next week' might be a 2. We can then set a threshold (e.g., only create follow-ups with a score > 5) to ensure only meaningful events are tracked. We can then map these categories to default intervals in a configuration file (e.g., health -> 2 days, work -> 7 days). This decouples the interval logic from the prompt, making it much easier to tune. If no follow-up is identified, it should return null. This strict JSON output is critical for reliable parsing.
* **Task 8.3: Integrate Follow-Up Creation into Memory Ingestion.**
    * **Objective:** To use the new prompt to create FOLLOW_UP memories during the post-conversation processing.
    * **Details:**
        * In MemoryService.ts, during the asynchronous, post-conversation ingestion phase, the conversation transcript will be passed to the new follow-up-identification.prompt.
        * After the service receives the array of potential follow-ups, it should first filter them based on the importance score from the previous task. Only the follow-ups that meet our configured threshold will proceed to have a Memory object created for them. This filtering step is crucial for maintaining a high-quality, relevant set of proactive memories. The prompt will be designed to return an array of potential follow-up objects. The service will iterate through this array, create all the Memory objects first, and then perform a single bulk-insert operation into the VectorStore rather than multiple individual writes. This reduces database overhead. It's important to note that this memory type does not need to be vectorized for similarity search; it will be retrieved directly by its date and status. This saves on embedding costs and storage space.
* **Task 8.4: Implement the Proactive Retrieval Logic.**
    * **Objective:** To check for pending follow-ups at the start of a new conversation.
    * **Details:**
        * Create a new method in MemoryService.ts: getPendingFollowUps(sessionId: string): Promise&lt;Memory[]>.
        * To avoid overwhelming the user, this method will query the VectorStore for memories where type === 'FOLLOW_UP', status === 'pending', and follow_up_date &lt;= new Date(), sorting the results by follow_up_date in ascending order and using a LIMIT 1 clause. This ensures we always address the most overdue follow-up first and only that one.
        * In the main conversation handler, this method will be called once, *before* the very first response is generated for a new session, to determine if a proactive greeting is needed.
* **Task 8.5: Implement the Follow-Up Conversation Flow.**
    * **Objective:** To use the retrieved follow-up memories to generate a proactive greeting and resolve the memory after the topic is addressed.
    * **Details:**
        * If getPendingFollowUps returns one or more memories, the application will not use the standard greeting.
        * Instead, it will take the topic of the most recent follow-up and use another specialized prompt (e.g., prompts/proactive-greeting.prompt.md) to generate a natural check-in question.
        * The check for dismissive language should be implemented as a simple, non-LLM utility function that uses a predefined list of keywords and phrases (e.g., 'don't want to talk', 'change the subject', 'never mind'). This makes the check fast, reliable, and cheap, avoiding unnecessary API calls for a simple classification task. Otherwise, it will be resolved after the follow-up has been initiated. A more advanced approach could involve a separate LLM call to determine if the user's response has adequately addressed the topic, but for V1, immediate resolution is the most reliable path.
* **Task 8.6: Add Tests for the Proactive System.**
    * **Objective:** To ensure the follow-up feature works reliably and correctly handles dates and status changes.
    * **Details:**
        * The test for the follow-up-identification.prompt logic will be expanded to also verify the category and importance score extraction. The test should include cases for undated events and assert that the correct category (e.g., 'health') is identified, which will allow us to also test the category-to-interval mapping logic in a separate unit test.
        * In features/memory/__tests__/MemoryService.test.ts, add tests for getPendingFollowUps, mocking the current date to verify that it correctly retrieves pending, past-due follow-ups but ignores future ones.
        * Write an end-to-end integration test that:
            1. Stores a conversation containing a future event.
            2. Asserts that a FOLLOW_UP memory is created with the correct date and status: 'pending'.
            3. Simulates time passing to the event date by mocking the system clock.
            4. Asserts that getPendingFollowUps now retrieves the memory.
            5. Asserts that the memory's status is updated to 'resolved' after the follow-up is initiated.
            6. Adds another test case that simulates the user responding with 'I'd rather not talk about it' and then asserts that the memory's status is still updated to 'resolved'.