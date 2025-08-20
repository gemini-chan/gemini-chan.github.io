# Feature: Conversation Summarization

> **Note:** This document outlines the complete feature requirements. The initial implementation phase focuses on building the UI scaffolding; the backend logic and session management are pending.

## 1. Introduction
This document outlines the requirements for a conversation summarization feature. The goal is to automatically generate a concise summary of a voice call transcript, display it in the call history, and allow the user to interact with it. This feature will use the `gemini-2.5-flash-lite` model, and reuse the user-provided API key for all Google models.

## 2. Epics

### 2.1. Epic: Automatic Summarization
This epic covers the core functionality for generating a summary from a call transcript.

#### 2.1.1. User Story: Generate Summary from Transcript
- **Priority**: High
- **As a** user,
- **I want** the system to automatically generate a summary of my voice call transcript,
- **so that** I can quickly understand the main points of the conversation.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Successful summary generation
  Given a call has ended
  When the transcript is available
  Then the system generates a concise summary of the conversation using the `gemini-2.5-flash-lite` model.
```

### 2.2. Epic: Call History Integration
This epic covers how summaries are stored and displayed in the call history.

### 2.3. Epic: Summary Interaction
This epic covers how users can interact with the summaries (e.g., replay via TTS).