

# Technical Tasks for Story 9: Psychological Trait Analysis

This document breaks down the technical work required to implement the ninth and final user story of the V2 upgrade. This feature introduces a meta-analysis capability to generate an evolving psychological profile of the user.


### **User Story 9:**

**As a user, I want Gemini-chan to develop an understanding of my personality and values, so she can adapt her interaction style to who I am.**


### **Acceptance Criteria:**



1. **Given** a user meets a configurable interaction threshold, **then** the system must generate a structured JSON psychological profile.
2. **Given** the profile is generated, **then** it must be stored as a PSYCH_PROFILE memory type and be overwritten by subsequent analyses.
3. **Given** a profile exists, **then** it must be used as meta-context by the PersonaManager to influence the AI's tone and proactive engagement.
4. **Given** the V3 "Mary" stage in mind, **then** the profile must include a structured list of the user's "Stated Values."
5. **Given** the user deletes their memories, **then** the PSYCH_PROFILE must also be irrevocably deleted.
6. **Given** the user asks about their personality, **then** a sanitized, two-step summary with a strong disclaimer must be provided.


### **Technical Tasks:**



* [ ] **Task 9.1: Update the Memory Data Model.**
    * **Objective:** To extend the data model to support the new PSYCH_PROFILE memory type.
    * **Details:**
        * In shared/types.ts, create a new interface PsychProfile that matches the JSON structure in Acceptance Criterion #1 (with keys for personality_traits, emotional_patterns, key_life_themes, and stated_values).
        * Update the Memory interface to include "PSYCH_PROFILE" in the memory_type union and add an optional profile_data?: PsychProfile; property.
* [ ] **Task 9.2: Design the Psychological Profile Generation Prompt.**
    * **Objective:** To create a sophisticated "meta-analysis" prompt that can synthesize a user's entire memory bank into a structured psychological profile.
    * **Details:**
        * Create a new prompt file: prompts/psych-profile-generation.prompt.md.
        * This prompt will be the most complex one yet. It will instruct the model to act as a psychological analyst.
        * It will take the user's entire memory history (facts, summaries, and chunks with emotion tags) as input.
        * The prompt will contain detailed instructions for each section of the output JSON, including a brief explanation of the Big Five personality traits to guide the model's inference for the personality_traits section.
        * It will be explicitly instructed to identify recurring emotional triggers and to list declarative statements of principle under stated_values.
* [ ] **Task 9.3: Create a ProfileAnalysisService.**
    * **Objective:** To build a new, dedicated service to manage the lifecycle of the psychological profile.
    * **Details:**
        * Create a new service at features/analysis/ProfileAnalysisService.ts.
        * The service will have a primary method: generateOrUpdateProfile(sessionId: string): Promise&lt;void>.
        * This method will:
            1. Retrieve all memories for the user via MemoryService.
            2. Check if the interaction threshold (e.g., conversation count) stored in the user's session data has been met.
            3. If so, format the entire memory bank into a context string.
            4. Call the Gemini API with the psych-profile-generation.prompt.
            5. Parse and validate the resulting JSON against the PsychProfile interface.
            6. Save the profile to the VectorStore as a single PSYCH_PROFILE memory, overwriting any previous version.
* [ ] **Task 9.4: Implement Periodic Trigger for Analysis.**
    * **Objective:** To run the resource-intensive profile analysis at sensible intervals without impacting performance.
    * **Details:**
        * The ProfileAnalysisService.generateOrUpdateProfile() method will be triggered as a non-blocking, background task.
        * This trigger will be placed in the main session management logic and will execute at the *end* of a conversation.
        * It will be conditional, running only when a configurable condition is met (e.g., if (conversationCount % 10 === 0)), ensuring it doesn't run too frequently.
* [ ] **Task 9.5: Integrate Profile with PersonaManager and Prompts.**
    * **Objective:** To feed the generated profile to the active persona, allowing it to adapt its behavior.
    * **Details:**
        * Modify the PersonaManager's logic. Before generating a response, it will now attempt to fetch the PSYCH_PROFILE for the current user.
        * If a profile exists, it will be summarized and injected into a new {psych_profile_context} placeholder in the active persona's prompt file (e.g., eve.persona.md).
        * All persona prompts will be updated to include this placeholder and instructions on how to use the profile to subtly adapt their tone and engagement strategy.
* [ ] **Task 9.6: Implement the User-Facing Summary Flow.**
    * **Objective:** To build the conversational flow for when a user asks to see their profile, including the ethical safeguards.
    * **Details:**
        * Implement intent detection for phrases like "what do you think of me?".
        * When detected, the flow will retrieve the PSYCH_PROFILE.
        * It will use a new prompt, prompts/profile-summary.prompt.md, to generate the sanitized, conversational summary. This prompt will be instructed to only use the key_life_themes and stated_values sections and to include the mandatory disclaimer.
        * The conversation manager will need to handle a temporary state to manage the two-step reveal for the more sensitive parts of the profile.
* [ ] **Task 9.7: Update Deletion Logic and Finalize Tests.**
    * **Objective:** To ensure the profile is handled correctly during deletion and that the entire system is thoroughly tested.
    * **Details:**
        * In MemoryService.ts, the deleteAllMemories method must be updated to also find and remove the PSYCH_PROFILE memory type.
        * Write comprehensive tests for the ProfileAnalysisService, mocking its dependencies.
        * Write integration tests to verify that the periodic trigger works as expected.
        * Write tests for the user-facing summary flow, including the two-step reveal and the presence of the disclaimer.
        * Update the memory deletion tests to assert that the PSYCH_PROFILE is successfully deleted along with all other data.