# Architecture: Reflective STS Emotion

This document details the technical implementation for the "Reflective STS Emotion" user story. The goal is to efficiently analyze the evolving conversation transcript to maintain a consistent, ambient emotional state for the AI persona.

## 1. Core Principle: Delta Analysis

The key to efficiency is to avoid re-analyzing the entire conversation transcript on every 10-second interval. We must only analyze the new conversational turns that have occurred since the last analysis cycle.

## 2. Data Flow and State Management

1.  **State Variable**: A state variable, let's call it `lastAnalyzedTranscriptIndex` or `lastAnalyzedTimestamp`, must be maintained within the main application controller (e.g., `app/main.tsx`). This variable will track how much of the transcript has already been processed for emotional context.
2.  **Timer Trigger**: The existing 10-second `emotionAnalysisTimer` continues to be the trigger for this process.
3.  **Transcript Slicing**: When the timer fires, the application will slice the main transcript array, grabbing only the portion that is newer than `lastAnalyzedTranscriptIndex`.
    *   **Example**: `const newTranscriptParts = transcript.slice(this.lastAnalyzedTranscriptIndex);`
4.  **Analysis**: If there are new parts, they are concatenated and sent to `NPUService.analyzeEmotion(newTranscriptParts.join(' '))`.
5.  **No Redundant Calls**: If `newTranscriptParts` is empty (i.e., no new conversation has happened), the call to `NPUService` is skipped entirely, conserving resources.
6.  **State Update**: The detected emotion from the NPU updates the central `emotion` state, which is passed to the `Live2DVisual` component.
7.  **Index Update**: Crucially, after a successful analysis, the `lastAnalyzedTranscriptIndex` is updated to the new length of the transcript (`this.lastAnalyzedTranscriptIndex = transcript.length;`).

## 3. Component Modifications

### a. `app/main.tsx` (or equivalent controller)

*   **Introduce State Variable**: Add a new class property, e.g., `private lastAnalyzedTranscriptIndex = 0;`.
*   **Modify `emotionAnalysisTimer` Callback**:
    *   The logic inside the `setInterval` for emotion analysis needs to be updated.
    *   It should get the current full transcript.
    *   It should slice the transcript from `this.lastAnalyzedTranscriptIndex`.
    *   It should check if the resulting slice has content.
    *   If it does, it calls `npuService.analyzeEmotion` with the sliced content.
    *   After the call, it must update `this.lastAnalyzedTranscriptIndex` to the new transcript length.
*   **Reset on New Session**: This index must be reset to `0` whenever a new conversation session begins (e.g., on page reload or when a "new chat" button is clicked).

### b. `features/ai/NPUService.ts`

*   No major changes are required here. The existing `analyzeEmotion` function is sufficient, as it is designed to analyze a given block of text. The change is in *what* text we send it and *when*.

This architecture refines the existing process from a brute-force, full-transcript analysis to an intelligent, delta-focused analysis. It makes the system more efficient, scalable, and responsive to the true flow of conversation.
