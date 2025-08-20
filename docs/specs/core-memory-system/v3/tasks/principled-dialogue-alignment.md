

**Developer's Note on Terminology:** As of v3 revision, we are adopting a more precise architectural terminology to clarify the system's design.


# Tasks: Principled Dialogue Alignment (Story 10)

This document outlines the technical tasks required to implement User Story 10, which introduces the "Values" layer to the Core Memory System. This feature is a prerequisite for the v3 stage of anima development, enabling the AI to understand and align with the user's core principles.


### 0. Dependencies and Definition of Done



* **Dependencies:** This story assumes the completion of the v1 (factual recall) and v2 (emotional resonance) memory layers. The NPU service depends on a stable conversation ingestion pipeline.
* **Definition of Done:** The story is considered complete when: 1) All tasks are implemented and unit/integration tests pass with >90% code coverage. 2) The end-to-end test suite (Task 4.2) passes successfully. 3) A manual QA session confirms that at least three different personas (e.g., Nurturing, Pragmatic, Cynical) correctly reference a seeded user value in a scripted scenario. 4) A performance review confirms the asynchronous NPU pipeline does not introduce noticeable latency to the user's chat experience.


### 1. Backend: VectorStore Enhancements


#### Task 1.1: Design and Implement "Values" Schema



* **Description:** Modify the VectorStore to support a new, indexed data layer specifically for user values. This is more than just adding fields; it's about creating a robust structure for storing complex, evolving principles. The schema for each entry must include:
    * value_concept (String): A normalized, machine-readable representation of the value (e.g., "integrity", "community", "personal_autonomy"). This ensures that different phrasings of the same value are grouped together.
    * conviction_score (Float): A floating-point number, initialized at a baseline and dynamically adjusted, representing the strength and consistency of this value in the user's psyche.
    * source_conversations (Array&lt;String>): An array of unique conversation IDs that serve as evidence for this value. This is crucial for debugging, user-initiated memory review, and potential future fine-tuning.
    * last_updated (Timestamp): A timestamp that is updated every time the conviction_score is modified. This is essential for the score decay logic.
* **File(s) Affected:** store/VectorStore.ts


#### Task 1.2: Implement Dynamic "Conviction Score" Algorithm



* **Description:** Create a new, standalone service (services/ValueAnalyticsService.ts) or add a dedicated method within the VectorStore that handles the business logic for calculating and updating the conviction_score. This algorithm is the core of the AI's evolving understanding. It must:
    * **Reinforcement:** Implement a method updateConviction(value, emotional_intensity) that increases the score. The formula should be non-linear; for example, new_score = old_score + (base_increment * intensity_multiplier). This ensures emotionally charged statements have a greater impact.
    * **Decay:** Implement a decayScores() method, perhaps run by a scheduled job, that applies a decay factor to all values. The formula could be new_score = old_score * (1 - decay_rate)^(days_since_last_update). This ensures the model reflects the user's most current principles.
* **File(s) Affected:** store/VectorStore.ts, a new services/ValueAnalyticsService.ts is recommended for separation of concerns.


### 2. AI Services: Natural Language Understanding (NPU)


#### Task 2.1: Develop Value Identification Model



* **Description:** Implement or fine-tune an NPU model capable of identifying and extracting core value statements from user dialogue. This is a sophisticated classification and entity recognition task. The model must be trained to:
    * **Differentiate Belief from Opinion:** Distinguish between a deeply held belief (e.g., "I believe honesty is fundamental") and a casual opinion ("I think that movie was good"). It should look for linguistic markers of conviction ("I've always felt that...", "My core principle is...").
    * **Assign Initial Score:** Analyze the sentiment, tone, and linguistic structure to assign an initial conviction_score. A statement made with strong, positive sentiment should receive a higher initial score than a neutral one.
* **File(s) Affected:** This will likely involve a new service (services/NPUValueExtractor.ts) that may interface with a third-party API or a locally hosted, fine-tuned model.


#### Task 2.2: Integrate NPU into the Memory Pipeline



* **Description:** Create a robust, asynchronous data pipeline. The flow should be: 1) The main conversation handler receives a message and immediately returns a response to the user for low latency. 2) Simultaneously, it pushes the message object {conversation_id, user_id, message_text, timestamp} to a message queue (e.g., RabbitMQ). 3) A separate, containerized worker service listens to this queue. 4) Upon receiving a message, the worker calls the NPU service. 5) If the NPU identifies a value, the worker calls the ValueAnalyticsService to update the VectorStore. 6) Implement a dead-letter queue to handle messages that fail processing repeatedly, preventing data loss and allowing for manual review.
* **File(s) Affected:** This will require modifications to the core conversation handling logic and the creation of a new worker/queueing system.


### 3. Core Logic: PersonaManager Integration


#### Task 3.1: Update RAG Process to Query "Values" Layer



* **Description:** Modify the PersonaManager's RAG process to perform a two-part retrieval:
    1. **Conversational Context:** Retrieve the top 3 most relevant conversation snippets based on the current user input, as is currently done.
    2. Value Context: Separately, retrieve the top 2 user values that are most semantically relevant to the current input, weighted by their conviction_score. The results of both queries will then be combined and passed to the prompt synthesis stage.
* **File(s) Affected:** features/persona/PersonaManager.ts


#### Task 3.2: Implement Value-Aware Prompt Synthesis



* **Description:** Implement the logic within PersonaManager to intelligently synthesize the retrieved values into the final LLM prompt. This is a critical step that requires precision. The logic must construct the prompt block exactly as specified in the user story's technical notes, including the prioritized list and, most importantly, the negative constraints that prevent the AI from becoming preachy or judgmental. This ensures the values inform the persona's *subtext*, not its literal text.
* **File(s) Affected:** features/persona/PersonaManager.ts


### 4. Testing and Validation


#### Task 4.1: Create Unit Tests for Conviction Score



* **Description:** Develop a comprehensive suite of unit tests for the ValueAnalyticsService. These tests must be isolated and cover all edge cases of the algorithm:
    * **Reinforcement:** Assert that the score increases correctly with repeated mentions.
    * **Decay:** Assert that the score decreases over a simulated time period.
    * **Bounds:** Assert that the score does not go below a minimum threshold (e.g., 0) or above a maximum cap.
    * **Initialization:** Assert that a new value is assigned the correct initial score based on test inputs.
* **File(s) Affected:** services/__tests__/ValueAnalyticsService.test.ts (new file)


#### Task 4.2: Develop End-to-End Test Suite for Persona Alignment



* **Description:** This suite must include at least the following scenarios:
    * **Scenario 1 (High Conviction):** Seed 'community' with a high score. The test conversation involves a career choice. Assert that the AI's response mentions community.
    * **Scenario 2 (Low Conviction):** Seed 'adventure' with a low score. The test conversation is about travel. Assert that the AI's response is neutral and does not heavily push the theme of adventure.
    * **Scenario 3 (Negative Alignment):** Seed 'honesty' with a high score. The test conversation is about choosing a movie. Assert that the AI does not irrelevantly mention honesty.
    * **Scenario 4 (Multi-Persona):** Run Scenario 1 with three different personas and assert that each response is both value-aligned and in-character.
* **File(s) Affected:** tests/persona-value-alignment.test.ts (new file)