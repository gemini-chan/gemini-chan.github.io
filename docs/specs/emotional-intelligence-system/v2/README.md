# AEI Specification v2: The Resonant Soul

## 1. Vision

This specification outlines the evolution of the Artificial Emotional Intelligence (AEI) system from a passive "Living Visage" (v1) into a dynamic, "Resonant Soul" (v2). The goal is to create an AI persona that not only displays emotion but feels and reacts in a way that is deeply connected to the conversational context, making interactions more authentic, empathetic, and engaging.

The core of v2 is a dual-mode emotional processing system:

1.  **Reactive Emotion (TTS Path)**: The AI's immediate spoken response (TTS) will be emotionally colored by a direct analysis of the user's latest input and the immediate context. This ensures the AI's reactions are timely and relevant to the user's emotional state.
2.  **Reflective Emotion (STS Path)**: The AI's ambient emotional state and general conversational demeanor (STS) will be shaped by a periodic analysis of the evolving conversation transcript. This provides a deeper, more consistent emotional undercurrent that reflects the overall sentiment and flow of the dialogue.

This dual system allows the Sourceress to have nuanced emotional expressions: quick, appropriate reactions in the moment, layered over a stable and evolving understanding of the longer-term emotional landscape of the conversation.

## 2. Key Stories

*   [**Reactive TTS Emotion**](./stories/reactive-tts-emotion.md): As a user, I want the AI's spoken responses to be emotionally appropriate to my direct questions and statements, making the conversation feel more natural and empathetic.
*   [**Reflective STS Emotion**](./stories/reflective-sts-emotion.md): As a user, I want the AI's general demeanor and emotional state to reflect the overall tone of our conversation, making the interaction feel more consistent and meaningful over time.

## 3. Technical Tasks

*   [**Architecture: Reactive TTS Emotion**](./tasks/tts-emotion-architecture.md): Design and implement the pipeline for analyzing user input to generate an immediate emotional context for TTS responses.
*   [**Architecture: Reflective STS Emotion**](./tasks/sts-emotion-architecture.md): Design and implement the mechanism for periodically and efficiently analyzing the conversation transcript to update the AI's baseline emotional state.
