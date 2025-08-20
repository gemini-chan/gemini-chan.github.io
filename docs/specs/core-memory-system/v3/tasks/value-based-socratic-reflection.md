

# Tasks: Integrated Socratic Reflection (Story 11)

This document outlines the technical tasks required to implement User Story 11, which introduces a Socratic dialogue capability using our two-model (NPU/VPU) architecture.


### 1. Orchestrator (PersonaManager) Enhancements


#### Task 1.1: Implement Main Control Flow



* **Description:** Modify the primary conversation handling logic within the PersonaManager to execute the new two-step NPU->VPU call sequence for every user message.
* **Action Items:**
    1. The function will first perform the standard RAG query to gather all necessary context (persona, memories, values, history).
    2. It will then call a new method, constructNpuMetaPrompt(), to assemble the prompt for the NPU.
    3. It will make the first API call to the NPU (gemini-2.5-flash) with this meta-prompt.
    4. It will receive the VPU prompt as a string from the NPU.
    5. It will make the second API call to the VPU (model selected by energy-bar-system) with the NPU-generated prompt to get the final user-facing response.
* **File(s) Affected:** features/persona/PersonaManager.ts


#### Task 1.2: Implement NPU Meta-Prompt Construction



* **Description:** Create the constructNpuMetaPrompt() method. This method is responsible for assembling all the raw data into the precise meta-prompt format that the NPU expects.
* **Action Items:**
    1. Load the external meta-prompt template file.
    2. Inject the dynamic context: base persona prompt, RAG memory results (including high-conviction values), and recent conversation history.
    3. Return the fully formed string, ready to be sent to the NPU.
* **File(s) Affected:** features/persona/PersonaManager.ts, templates/npu_meta_prompt.txt (new file)


### 2. NPU (Prompt Engineering)


#### Task 2.1: Develop and Refine NPU Meta-Prompt Template



* **Description:** This is a core prompt engineering task. The goal is to create a robust meta-prompt that reliably instructs the NPU (gemini-2.5-flash) to act as a "prompt generator" for the VPU.
* **Action Items:**
    1. Draft the initial meta-prompt in templates/npu_meta_prompt.txt, following the structure outlined in the User Story 11 Technical Notes.
    2. Include clear "few-shot" examples within the prompt to guide the NPU's behavior. For example, show it an input with a dilemma and the exact VPU prompt it should generate as a result.
    3. Create an evaluation script to test the NPU's output against a variety of inputs (dilemma, no dilemma, resolution) to ensure it consistently generates the correct VPU prompt structure.
* **File(s) Affected:** templates/npu_meta_prompt.txt (new file), scripts/evaluate_npu_prompt.ts (new file)


### 3. Testing and Validation


#### Task 3.1: Create Unit Tests for the Orchestrator



* **Description:** Develop unit tests for the PersonaManager to validate the new logic, mocking the external API calls.
* **Action Items:**
    1. Write a test to ensure constructNpuMetaPrompt() correctly loads the template and injects the context.
    2. Write a test to verify that the main control flow correctly makes the first call to the NPU and then uses its output to make the second call to the VPU. Mock both API clients.
    3. Test error handling for scenarios where the NPU or VPU API calls fail.
* **File(s) Affected:** features/persona/__tests__/PersonaManager.test.ts


#### Task 3.2: Develop End-to-End Test Suite for Socratic Flow



* **Description:** Create a new end-to-end test suite that validates the entire two-step process, making live (or near-live, sandboxed) calls to the Gemini API.
* **Action Items:**
    1. **Scenario 1 (Socratic Activation):** Seed the VectorStore with a value. Simulate a user dilemma. Assert that the final response from the VPU is a Socratic question that references the value.
    2. **Scenario 2 (Normal Conversation):** Seed the VectorStore with a value. Simulate a normal, non-dilemma user message. Assert that the final response from the VPU is a standard conversational reply, not a Socratic question.
    3. **Scenario 3 (Socratic Deactivation):** Create a multi-turn test. The first turn is a dilemma (asserts Socratic response). The second turn is a resolution ("Thanks, I get it now."). Assert that the third turn's response is a standard conversational reply.
* **File(s) Affected:** tests/socratic-reflection-flow.test.ts (new file)