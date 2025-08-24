# Architecture: Reactive TTS Emotion

This document outlines the technical implementation for the "Reactive TTS Emotion" user story. The goal is to analyze the user's latest input to generate an emotionally appropriate TTS response from the VPU.

## 1. Data Flow

The proposed data flow is as follows:

1.  **User Input**: The user speaks, and their input is transcribed into text.
2.  **Pre-VPU Analysis**: Before this text is sent to the `VPUService` for a full response, it is first sent to the `NPUService` for a rapid, targeted emotion analysis.
3.  **Emotion Extraction**: A new function, let's call it `NPUService.analyzeUserInputEmotion(text: string): Promise<string>`, will be created. This function will use a lightweight prompt focused solely on extracting the primary emotion from the user's text (e.g., "joy," "frustration," "curiosity").
4.  **Context Injection**: The extracted emotion is then passed as a new parameter to the `VPUService.generateResponse` method.
5.  **Emotion-Aware Prompting**: The `VPUService` will modify its prompt to the generative model, instructing it to craft a response *and* deliver it in a tone that matches the provided emotion.
    *   **Example Prompt Snippet**: `"...craft a helpful response. Deliver it with a tone of ${emotion}."`
6.  **TTS Generation**: The generative model produces the text, which is then sent to the TTS service. The inherent emotional instruction in the prompt will guide the TTS engine's vocal performance.

## 2. Component Modifications

### a. `features/ai/NPUService.ts`

*   **Create `analyzeUserInputEmotion(text: string)`:**
    *   This will be a new public method.
    *   It will use a specific, lean prompt for high speed.
    *   It should utilize the most efficient model available (`gemini-2.5-flash-lite` or similar) to minimize latency.
    *   It will return a string representing the detected emotion (e.g., 'neutral', 'happy', 'curious').

### b. `features/vpu/VPUService.ts`

*   **Modify `generateResponse` method signature:**
    *   Update from `generateResponse(context)` to `generateResponse(context, emotion: string = 'neutral')`.
*   **Update Prompt Generation Logic:**
    *   The internal prompt sent to the Gemini model must be updated to include the `emotion` parameter. This will instruct the model to adopt a specific tone in its textual response, which will naturally translate into the TTS voice.

### c. `app/main.tsx` (or equivalent controller)

*   **Update the Response Generation Logic:**
    *   The main application logic that handles user input will need to be altered.
    *   Instead of calling `vpuService.generateResponse` directly, it will now follow a sequence:
        1.  `const userEmotion = await npuService.analyzeUserInputEmotion(userInputText);`
        2.  `await vpuService.generateResponse(context, userEmotion);`

This architecture ensures a clean separation of concerns: the NPU handles fast, specific emotional analysis, while the VPU focuses on generating a holistically appropriate and emotionally-tinted response.
