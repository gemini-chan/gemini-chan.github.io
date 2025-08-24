# AEI System v3: Unified NPU-TTS Flow - Requirements

## Introduction

This document outlines the requirements for the third evolution of the Artificial Emotional Intelligence (AEI) system. The core goal of v3 is to refactor the Text-to-Speech (TTS) interaction flow to be more efficient and intelligent.

Currently, the system makes separate API calls to analyze user emotion and to generate a response. This version aims to unify these into a single, powerful operation within the Neural Processing Unit (NPU). The NPU will act as an intelligent proxy, analyzing the user's input for emotional state, retrieving relevant memories, and constructing a comprehensive context package. This package will then be passed to the Vocal Processing Unit (VPU) to generate a response, and the emotional analysis will be used directly to drive the Live2D vessel's animation in real-time.

## Prioritized Epics

1.  **Epic 1: The Seer's Unified Gaze (NPU Refactoring):** Reforge the NPU to analyze a user's message for both emotional state (with a confidence score) and relevant memories in a single, efficient operation, returning a unified context object.
2.  **Epic 2: The Actor's True Reflection (VPU & Live2D Integration):** Teach the VPU and the main application how to utilize the unified context from the NPU. The VPU will use the enhanced prompt for its response, and the main application will use the emotional analysis to drive the Live2D animation.

---

## Epic 1: The Seer's Unified Gaze (NPU Refactoring)

### User Stories

#### Story 1.1: Unified Emotional and Contextual Analysis

*   **As a** developer,
*   **I want** the `NPUService` to perform both emotional analysis (with a confidence score) and memory retrieval in a single, unified method,
*   **so that** I can obtain all necessary context for a TTS response with a single, efficient call.

**Acceptance Criteria:**

*   **Given** a user message and a persona ID,
*   **When** I call the new unified analysis method in `NPUService`,
*   **Then** the service should return a single object containing:
    *   The detected primary emotion (e.g., "joy", "neutral").
    *   A confidence score for the emotion (a number between 0.0 and 1.0).
    *   An array of retrieved `Memory` objects.
    *   The final, RAG-enhanced prompt string ready to be sent to the VPU.
*   **And** this should be achieved by instructing the underlying model to perform all tasks in one inference step.

#### Story 1.2: Structured JSON Output for NPU

*   **As a** developer,
*   **I want** the NPU's underlying Gemini model to return a structured JSON object,
*   **so that** I can reliably parse the emotion, confidence score, and any other analytical data.

**Acceptance Criteria:**

*   **Given** a prompt designed for unified analysis,
*   **When** the `NPUService` calls the Gemini API,
*   **Then** the prompt must instruct the model to respond with a JSON object containing at least `emotion` and `confidence` fields.
*   **And** the `NPUService` must be able to successfully parse this JSON response.
*   **And** if parsing fails, the system should gracefully fall back to a "neutral" emotion with a confidence of 0.5.