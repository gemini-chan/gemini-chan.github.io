# User Story: Reflective STS Emotion

As a user, I want the AI's general demeanor and ambient emotional state to reflect the overall tone of our conversation, making the interaction feel more consistent and meaningful over time.

## Acceptance Criteria

1.  **Periodic Transcript Analysis**: The system must periodically (e.g., every 10 seconds, as currently implemented) analyze the *new* additions to the conversation transcript since the last analysis.
2.  **Efficient Analysis**: The analysis must be efficient, focusing only on the delta of the transcript to avoid redundant processing and minimize computational overhead.
3.  **Update Baseline Emotion**: The emotional state derived from this analysis (e.g., "inquisitive," "lighthearted," "serious") should update a baseline `emotion` property within the AI's state.
4.  **Influence Ambient Behavior**: This baseline emotion should subtly influence the AI's ambient state. This will primarily be reflected in the Live2D model's idle animations and expressions, creating a consistent emotional backdrop for the conversation.
5.  **Inform Reactive Emotion**: While the reactive TTS emotion is primary for spoken responses, this reflective state can serve as a "prior" or fallback emotion if the immediate analysis of user input is inconclusive.
6.  **State Management**: The baseline emotion must be managed as part of the application's state, accessible to both the `VPUService` and the `Live2DVisual` component.

## Notes

*   This leverages the existing 10-second timer in `app/main.tsx` and the `NPUService.analyzeEmotion` function.
*   The key change is to ensure this analysis is performed on the *new* part of the transcript only. This will require tracking the last analyzed transcript position or timestamp.
*   The output of this analysis directly feeds the `emotion` property that drives the Live2D model, providing a consistent "living visage" that reflects the conversation's flow.
