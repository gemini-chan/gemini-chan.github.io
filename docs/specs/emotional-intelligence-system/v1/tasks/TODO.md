# Quest Log: Forging the Emotional Soul (AEI v1)

This scroll contains the ordered tapestry of quests required to forge the Artificial Emotional Intelligence system, as designed by the Celestial Cartographer and illuminated by the Scryer of the Codeverse. Let the Great Sourceress walk this path with care and precision.

## Phase 1: The Speaking Soul - Emotion Interpretation

*   [x] **Quest 1: Heed the Oracle's True Voice.**
    *   **Task:** Absorb the Scryer's revelation that emotion is conveyed via LLM-driven tokens within the streaming text response, not through audio analysis.
    *   **Outcome:** The grand design is re-aligned with the reality of the codeverse.

*   [x] **Quest 2: Define the Stardust.**
    *   **Task:** Create the `EmotionEvent` interface in a shared types file (`shared/types.ts`).
    *   **Details:** The interface matches the blueprint: `emotion`, `intensity`, and `timestamp`.

*   [x] **Quest 3: Reforge the Vessel.**
    *   **Task:** Rename `EmotionAnalysisService` to `EmotionTokenParser` and update its purpose.
    *   **Location:** `features/emotion/EmotionTokenParser.ts`
    *   **Details:** The class will no longer analyze audio, but will parse strings for emotion tokens (e.g., `<|EMOTE_HAPPY|>`) and emit `EmotionEvent`s.

*   [x] **Quest 4: Grant the Vessel Understanding.**
    *   **Task:** Implement the core `parse(text: string)` method within the `EmotionTokenParser`.
    *   **Details:** This method will use regular expressions to find, extract, and emit `EmotionEvent`s from a given text stream. It should also return the cleaned text with tokens removed.

## Phase 2: The Resonant Soul - Empathetic Response

*   [ ] **Quest 5: Teach the Voice to Feel.**
    *   **Task:** Enhance the `VPUService` to modulate its vocal tone based on an `EmotionEvent`.
    *   **Details:** This involves mapping emotions to specific TTS prosody parameters (pitch, rate, volume).

*   [ ] **Quest 6: Grant the Body Expression.**
    *   **Task:** Enhance the `Live2DAnimationController` with the new `expressEmotion(emotion)` method.
    *   **Details:** This method will map incoming `EmotionEvent`s to specific, subtle animation triggers and manage the graceful return to a neutral state.

## Phase 3: The Grand Weaving - System Integration

*   [ ] **Quest 7: Weave the Threads Together.**
    *   **Task:** Integrate the `EmotionTokenParser` into the main `GdmLiveAudio` component.
    *   **Details:** The incoming text stream from the Gemini Live API must be piped through the parser. The resulting `EmotionEvent`s must be dispatched to the `EmotionQueueSystem`, which will then inform the `VPUService` and `Live2DAnimationController`.

*   [ ] **Quest 8: The Trials of Harmony.**
    *   **Task:** Write a comprehensive suite of tests.
    *   **Details:**
        *   Unit tests for the `EmotionTokenParser` with various token patterns.
        *   Integration tests to ensure the VPU and Live2D controller react correctly to mocked `EmotionEvent`s from the queue.
        *   An end-to-end test to verify that a sample API response with tokens produces the expected vocal and visual response.

Let these quests guide your hand, Great Sourceress. Weave them well.