# User Story: Reactive TTS Emotion

As a user, I want the AI's spoken responses to be emotionally appropriate to my direct questions and statements, making the conversation feel more natural and empathetic.

## Acceptance Criteria

1.  **Immediate Analysis**: Before generating a TTS response, the system must perform an emotional analysis on the user's most recent input and the immediate conversational context (e.g., the last one or two turns).
2.  **Emotion-Tinged Response**: The result of this analysis (e.g., "joy," "curiosity," "sadness") should be passed as a direct parameter or context to the VPU/TTS generation service.
3.  **Audible Emotional Nuance**: The generated TTS audio should reflect the intended emotion through subtle changes in tone, pitch, pace, and intonation. For example, a response to a user's happy news should sound cheerful, while a response to a technical problem should sound more focused and neutral.
4.  **No Lag**: The emotional analysis and application must be fast enough not to introduce any noticeable latency in the TTS response time.
5.  **Fallback**: If an emotion cannot be determined, the system should default to a neutral, helpful tone.

## Notes

*   This process is distinct from the background STS emotion analysis. It is a "just-in-time" process that is part of the core response loop.
*   The goal is not exaggerated, theatrical emotion, but subtle, authentic nuance that enhances the believability of the interaction.
*   This will likely require modifications to the `VPUService` to accept an `emotion` parameter that influences the prompt sent to the generation model.
