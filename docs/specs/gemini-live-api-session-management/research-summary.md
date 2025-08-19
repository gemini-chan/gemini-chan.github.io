# Research Summary: Integrating the Existing Summarization Service

## 1. Overview

An existing summarization service has been identified within the codebase, which can be leveraged to meet the requirements of the Gemini Live API session management feature. This document provides a summary of the service's interface and guidance on how to integrate it.

## 2. Summarization Service Analysis

### 2.1. Implementation

The summarization service is implemented in the `SummarizationService` class, located at `features/summarization/SummarizationService.ts`.

-   **Class:** [`SummarizationService`](features/summarization/SummarizationService.ts:6)
-   **Method:** [`summarize(transcript: Turn[]): Promise<string>`](features/summarization/SummarizationService.ts:13)

The service is initialized with a `GoogleGenAI` client instance and uses the `gemini-2.5-flash-lite` model to generate summaries.

### 2.2. Interface and Data Types

The `summarize` method accepts a `transcript` argument, which is an array of `Turn` objects. The `Turn` interface is defined in `shared/types.ts` as follows:

```typescript
export interface Turn {
  speaker: "user" | "model";
  text: string;
}
```

-   **Type Definition:** [`Turn`](shared/types.ts:1)

## 3. Integration Plan

The session management feature, as defined in `docs/specs/gemini-live-api-session-management/requirements.md`, requires the system to summarize the conversation transcript when a session falls back to a non-resumable model.

### 3.1. Triggering Summarization

The summarization service should be called when the conditions for fallback are met, as described in the user story "Summarize Transcript on Fallback" ([`requirements.md#2.3.2`](docs/specs/gemini-live-api-session-management/requirements.md:39)).

### 3.2. Providing the Transcript

The full conversation transcript, in the format of a `Turn[]` array, should be passed to the `summarize` method.

### 3.3. Using the Summary

The returned summary string should then be injected into the new session's context, along with the last four turns of the conversation, as specified in the acceptance criteria ([`requirements.md#51`](docs/specs/gemini-live-api-session-management/requirements.md:51)).

## 4. Conclusion

The existing `SummarizationService` is well-suited for the needs of the session management feature. By following the integration plan outlined above, the feature can be implemented in accordance with the specified requirements.