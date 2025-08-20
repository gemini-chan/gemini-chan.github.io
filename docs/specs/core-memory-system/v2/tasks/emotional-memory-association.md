

# Technical Tasks for Story 7: Emotional Memory Association

This document breaks down the technical work required to implement the seventh user story of the "Enable Persistent Memory" epic. This feature integrates emotion detection with the memory system to enable empathetic recall.


### **User Story 7:**

**As a user, I want Gemini-chan to remember the emotions associated with our conversations, so her recall is more empathetic and she understands not just what we talked about, but how it felt.**


### **Prerequisite Feature:**

The tasks outlined below are for integrating an existing emotion detection capability with the memory system. This plan presumes that the core functionality described in the docs/specs/emotion-detection spec has been implemented as its own, separate user story. Task 7.1 is the first step of *this* story, which is to create the service interface that the rest of the application will use.


### **Technical Tasks:**



* **Task 7.1: Implement the EmotionDetectionService.**
    * **Objective:** To create a new, self-contained, and performant service that analyzes the user's voice from the microphone's audio stream and provides real-time emotion classification without impacting application performance.
    * **Details:**
        * A new service file will be created at features/emotion/EmotionDetectionService.ts.
        * **Off-Thread Processing:** To prevent UI freezes, the core audio processing and model inference will run in a **Web Worker**. The main service on the main thread will be responsible for managing the worker's lifecycle and communicating with it.
        * **Audio Pipeline:** The service will capture the raw PCM audio stream from the microphone. This stream will be passed to the Web Worker. Inside the worker, the audio data will be processed (e.g., using a Fast Fourier Transform to create a spectrogram) into a format suitable for the emotion recognition model.
        * **Client-Side Model:** As per the design document, we will use a lightweight, pre-trained speech emotion recognition model (e.g., a quantized version of a model like wav2vec2-large-xlsr-53-english-speech-emotion-recognition from Hugging Face) via the transformers.js library. This ensures that all processing happens client-side, preserving user privacy.
        * **API and Data Structure:** To ensure consistency across the application, the EmotionLog type will be formally defined in shared/types.ts. The service will expose a simple API: start(stream: MediaStream), stop(), and getEmotionHistory(startTime: Date, endTime: Date): EmotionLog[]. It will continuously analyze the audio and store a time-series log of emotion predictions in a short-term in-memory buffer.
* **Task 7.2: Integrate Emotion Tagging into Memory Ingestion.**
    * **Objective:** To seamlessly connect the new EmotionDetectionService to the MemoryService so that conversational chunks are automatically and accurately tagged with an emotion when they are stored.
    * **Details:**
        * In shared/types.ts, the Memory interface will be updated to include an optional emotion?: string; property.
        * In MemoryService.ts, the post-conversation ingestion process for CONVERSATION_CHUNK memories will be modified. After a chunk is created, the service will query the EmotionDetectionService using the getEmotionHistory method, passing the start and end timestamps of that specific chunk.
        * **Averaging Logic:** The service will receive a log of all emotion readings for that time period. It will then calculate the average confidence score for each emotion (joy, sadness, etc.) across the log. The emotion with the highest average score will be chosen as the dominant emotion for that chunk.
        * **Confidence Threshold:** The emotion confidence threshold will be managed in a centralized configuration file to allow for easy tuning without code changes. If the highest average emotion score is below this threshold, the emotion will be tagged as neutral. This prevents low-confidence or ambiguous emotional readings from being stored, ensuring the AI's empathy is based on clear signals.
        * The resulting dominant emotion (e.g., "joy") will be added to the metadata of the Memory object before it is embedded and stored in the VectorStore.
* **Task 7.3: Enhance the Conversational Prompt for Empathy.**
    * **Objective:** To update the main conversational prompt to explicitly instruct the AI on how to use the new emotion metadata to create genuinely empathetic and tonally appropriate responses.
    * **Details:**
        * The context injection logic in prompts/contextual-conversation.prompt.md will be updated.
        * When a retrieved memory chunk has an associated emotion that is not neutral, it will be formatted and passed to the prompt with a clear label. For example: Relevant Conversation Excerpt (The user felt JOY during this part of the conversation): [text of the chunk].
        * The prompt's instructions will be significantly enhanced: "Your goal is to be an empathetic companion. If a conversation excerpt includes an emotional context, you **must** use that information to shape the *tone* of your response. For example, if the user felt 'joy,' be enthusiastic and share in their excitement. If they felt 'sadness,' be gentle, supportive, and validating. If they felt 'stress,' acknowledge the difficulty of the situation. If no emotion is provided, or the emotion is 'neutral', do not attempt to guess the user's feelings. Simply respond based on the content of the conversation. Your response should reflect that you remember not just what was said, but how it felt."
* **Task 7.4: Update Memory Review for Tonal Summarization.**
    * **Objective:** To modify the memory review prompt to leverage the stored emotion tags, influencing the tone of the summary to make it feel more human and less like a data report.
    * **Details:**
        * In prompts/memory-summary.prompt.md, the instructions for the LLM will be updated.
        * The prompt will now receive the emotion tags along with the memory content for each chunk.
        * A new rule will be added: "When you summarize a memory, use the associated emotion to guide your word choice and tone. For a memory associated with 'joy,' use positive and bright language (e.g., 'We had a wonderful conversation about...'). For a memory associated with 'stress,' use more understanding and neutral language (e.g., 'We talked through that challenging project you were working on.'). **Do not state the emotion directly**; instead, let it influence your writing style to make the summary feel more natural and empathetic."
* **Task 7.5: Add Tests for Emotion-Memory Integration.**
    * **Objective:** To ensure the entire pipeline, from emotion detection through storage to empathetic response generation, is working correctly and is robust against failure.
    * **Details:**
        * A new test suite will be created for the EmotionDetectionService. This will involve mocking a MediaStream and feeding it pre-recorded audio clips representing different emotions. The tests will assert that the service correctly classifies the emotion for each clip.
        * In features/memory/__tests__/MemoryService.test.ts, new tests will be added to verify the integration. These tests will mock the EmotionDetectionService to return a predictable emotion history. We will then trigger the memory ingestion process and assert that the Memory objects passed to the (mocked) VectorStore contain the correct emotion tag.
        * A new test case will be added for the confidence threshold logic. This test will mock the EmotionDetectionService to return an emotion history where the highest average score is *below* the configured threshold. We will then assert that the resulting Memory object is correctly tagged with emotion: 'neutral'.
        * The end-to-end tests for conversational recall will be updated. A test will now involve storing a memory with a specific emotion tag (e.g., sadness). It will then simulate a new user query that retrieves this memory and will assert that the final prompt sent to the (mocked) LLM includes the correctly formatted emotional context (e.g., "The user felt SADNESS...").