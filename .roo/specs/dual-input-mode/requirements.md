# Feature: Dual-Input Mode

## 1. Introduction
This document outlines the requirements for a dual-input mode that simulates a realistic messaging/calling experience. Users can interact via text messaging (TTS flow) or voice calling (STS flow) with separate contexts for each mode. The interface mimics a messaging app with texting on the left and calling functionality, featuring dynamic transcript windows that appear based on the active mode.

## 2. Requirements

### 2.1. Text Messaging Mode (Text In, Speech Out - TTS Flow)
- **As a** user,
- **I want** to send messages by typing in a chat interface like texting a real person,
- **so that** I can have text-based conversations with Gemini-chan that feel like messaging.

#### 2.1.1. Acceptance Criteria
- **WHEN** the application loads **THEN** the chat window is visible on the left side displaying the texting interface
- **WHEN** no call is active **THEN** the chat window remains visible for text messaging
- **WHEN** I type a message and click "Send" **THEN** a TTS session is initiated with the `gemini-2.5-flash-live-preview` model
- **WHEN** I send a message in TTS mode **THEN** the message appears in the chat transcript and the model's audio response is streamed back
- **WHEN** the model responds in TTS mode **THEN** the chat transcript is updated with the model's response text

### 2.2. Voice Calling Mode (Speech In, Speech Out - STS Flow)
- **As a** user,
- **I want** to start a voice call by clicking a "Call" button,
- **so that** I can talk to Gemini-chan like calling a real person.

#### 2.2.1. Acceptance Criteria
- **WHEN** the application loads **THEN** a "Call" button is visible (not "Record" button)
- **WHEN** I click the "Call" button **THEN** a STS session is initiated with the `gemini-2.5-flash-exp-native-audio-thinking-dialog` model and audio recording starts immediately
- **WHEN** a call is active **THEN** the chat window is hidden and a separate call transcript window appears
- **WHEN** the model responds during a call **THEN** the audio is played back and transcribed text appears in the call transcript window
- **WHEN** I end the call **THEN** the call transcript window disappears and the chat window becomes visible again

### 2.3. Separate Context Management
- **As a** user,
- **I want** to maintain separate conversation contexts for texting and calling,
- **so that** each mode preserves its own conversation history independently.

#### 2.3.1. Acceptance Criteria
- **WHEN** I switch from texting to calling **THEN** the texting context is preserved but not shared with the calling session
- **WHEN** I switch from calling to texting **THEN** the calling context is preserved but not shared with the texting session
- **WHEN** I return to a previously used mode **THEN** the conversation history for that mode is restored
- **WHEN** switching between modes **THEN** no confirmation dialog appears (contexts are preserved separately)

### 2.4. Dynamic Transcript Windows
- **As a** user,
- **I want** transcript windows to dynamically appear based on the active mode,
- **so that** I have a clear view of the relevant conversation without clutter.

#### 2.4.1. Acceptance Criteria
- **WHEN** no call is active **THEN** only the chat window (texting interface) is visible
- **WHEN** a call becomes active **THEN** the chat window is hidden and the call transcript window appears
- **WHEN** a call ends **THEN** the call transcript window is hidden and the chat window reappears
- **WHEN** the call transcript window is visible **THEN** it displays real-time transcription of the voice conversation

### 2.5. Model Animation
- **As a** user,
- **I want** the model to animate in response to both text and voice interactions,
- **so that** the experience is more engaging and immersive.

#### 2.5.1. Acceptance Criteria
- **WHEN** the model is speaking in either TTS or STS mode **THEN** the model's lips are synchronized with the audio
- **WHEN** the model is listening or idle **THEN** the model exhibits subtle idle animations
- **WHEN** switching between modes **THEN** the model animation continues seamlessly

### 2.6. Reset Functionality
- **As a** user,
- **I want** to be able to reset conversations independently for each mode,
- **so that** I can start fresh in either texting or calling without affecting the other.

#### 2.6.1. Acceptance Criteria
- **WHEN** I reset during texting mode **THEN** only the texting context and chat transcript are cleared
- **WHEN** I reset during calling mode **THEN** only the calling context and call transcript are cleared
- **WHEN** I reset one mode **THEN** the other mode's context remains intact