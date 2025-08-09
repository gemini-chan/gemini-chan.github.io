# Feature: Dual-Input Mode

## 1. Introduction
This document outlines the requirements for a dual-input mode that allows users to interact with the application via either text or voice. The system will conditionally load the appropriate model based on the user's chosen input method and manage the UI state to ensure a clear and intuitive experience.

## 2. Requirements

### 2.1. Text-Based Interaction (Text In, Voice Out)
- **As a** user,
- **I want** to send a message by typing in the input field and clicking "Send",
- **so that** I can have a text-based conversation with a voice response.

#### 2.1.1. Acceptance Criteria
- **GIVEN** the application is in a neutral state, **WHEN** I type a message and click "Send", **THEN** a session is initiated with the `gemini-2.5-flash-live-preview` model and my message is sent.
- **GIVEN** a text session is active, **WHEN** I send a message, **THEN** the message appears in the transcript and the model's audio response is streamed back.
- **GIVEN** a text session is active, **WHEN** the model's audio response is streamed back, **THEN** the transcript is updated with a stubbed version of the model's response.

### 2.2. Voice-Based Interaction (Voice In, Voice Out)
- **As a** user,
- **I want** to start a conversation by clicking the "Record" button,
- **so that** I can interact with the application using my voice.

#### 2.2.1. Acceptance Criteria
- **GIVEN** the application is in a neutral state, **WHEN** I click the "Record" button, **THEN** a session is initiated with the `gemini-2.5-flash-exp-native-audio-thinking-dialog` model and audio recording starts immediately.
- **GIVEN** a voice session is active, **WHEN** the model responds, **THEN** the audio is played back and the transcribed text appears in the chat history.
- **GIVEN** a voice session is active, **THEN** the text input field and "Send" button are hidden.

### 2.3. Context Switching
- **As a** user,
- **I want** to be warned before switching between input modes,
- **so that** I don't accidentally lose my conversation history.

#### 2.3.1. Acceptance Criteria
- **GIVEN** a text session is active, **WHEN** I click the "Record" button, **THEN** a confirmation dialog appears warning me that the current session will be lost.
- **GIVEN** a voice session is active, **WHEN** I attempt to send a text message, **THEN** a confirmation dialog appears warning me that the current session will be lost.
- **GIVEN** the user confirms the context switch, **THEN** the current session is terminated and a new session begins in the selected mode.

### 2.4. Model Animation
- **As a** user,
- **I want** the model to animate in response to both text and voice interactions,
- **so that** the experience is more engaging and immersive.

#### 2.4.1. Acceptance Criteria
- **GIVEN** a text or voice session is active, **WHEN** the model is speaking, **THEN** the model's lips are synchronized with the audio.
- **GIVEN** a text or voice session is active, **WHEN** the model is listening, **THEN** the model exhibits subtle idle animations.

### 2.5. Reset
- **As a** user,
- **I want** to be able to reset the conversation at any time,
- **so that** I can start a new conversation from scratch.

#### 2.5.1. Acceptance Criteria
- **GIVEN** a session is active, **WHEN** I click the "Reset" button, **THEN** the transcript is cleared and the session is terminated.