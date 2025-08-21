# Quest Log: Forging the Emotional Soul (AEI v1)

This scroll contains the ordered tapestry of quests required to forge the Artificial Emotional Intelligence system, as designed by the Celestial Cartographer. Let the Great Sourceress walk this path with care and precision.

## Phase 1: The Seeing Eye - Emotion Perception

*   [ ] **Quest 1: Choose the Oracle.**
    *   **Task:** Research and select a suitable pre-trained, client-side Speech Emotion Recognition (SER) model.
    *   **Considerations:** The model must be performant (low latency), accurate, and compatible with a web environment (TensorFlow.js, ONNX Runtime Web).
    *   **Outcome:** A decision on the model to be used, and a link to its documentation or repository.

*   [ ] **Quest 2: Define the Stardust.**
    *   **Task:** Create the `EmotionEvent` interface in a shared types file (e.g., `shared/types.ts`).
    *   **Details:** The interface must match the blueprint: `emotion`, `intensity`, and `timestamp`.

*   [ ] **Quest 3: Forge the Vessel.**
    *   **Task:** Create the file and basic class structure for the `EmotionAnalysisService`.
    *   **Location:** `features/emotion/EmotionAnalysisService.ts`
    *   **Details:** The class should be initialized with its dependencies (e.g., the SER model loader).

*   [ ] **Quest 4: Grant the Vessel Sight.**
    *   **Task:** Implement the logic to load the chosen SER model within the `EmotionAnalysisService`.
    *   **Details:** Then, implement the core `analyzeStream(audioChunk)` method to process audio data and emit `EmotionEvent`s.

## Phase 2: The Resonant Soul - Empathetic Response

*   [ ] **Quest 5: Teach the Voice to Feel.**
    *   **Task:** Enhance the `VPUService` to modulate its vocal tone based on an `EmotionEvent`.
    *   **Details:** This involves mapping emotions to specific TTS prosody parameters (pitch, rate, volume).

*   [ ] **Quest 6: Teach the Mind to Understand.**
    *   **Task:** Enhance the VPU's prompt generation logic.
    *   **Details:** The system prompt sent to the core LLM must be augmented with the detected emotion, instructing the model to tailor the *content* of its response accordingly.

*   [ ] **Quest 7: Grant the Body Expression.**
    *   **Task:** Enhance the `Live2DAnimationController` with the new `expressEmotion(emotion)` method.
    *   **Details:** This method will map incoming `EmotionEvent`s to specific, subtle animation triggers and manage the graceful return to a neutral state.

## Phase 3: The Grand Weaving - System Integration

*   [ ] **Quest 8: Weave the Threads Together.**
    *   **Task:** Integrate the `EmotionAnalysisService` into the main real-time call loop.
    *   **Details:** The user's audio stream must be piped to the service. The resulting `EmotionEvent`s must be dispatched to both the `VPUService` and the `Live2DAnimationController`.

*   [ ] **Quest 9: The Trials of Harmony.**
    *   **Task:** Write a comprehensive suite of tests.
    *   **Details:**
        *   Unit tests for the `EmotionAnalysisService` (mocking the SER model).
        *   Integration tests to ensure the VPU and Live2D controller react correctly to mocked `EmotionEvent`s.
        *   An end-to-end test to verify that a sample audio input produces the expected vocal and visual response.

Let these quests guide your hand, Great Sourceress. Weave them well.