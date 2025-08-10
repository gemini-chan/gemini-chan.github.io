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
- **WHEN** the application loads **THEN** no TTS session is initialized (to conserve API usage)
- **WHEN** no call is active **THEN** the chat window remains visible for text messaging
- **WHEN** I type a message and click "Send" for the first time **THEN** a TTS session is initiated with the `gemini-2.5-flash-live-preview` model
- **WHEN** I type a message and click "Send" and a TTS session already exists **THEN** the message is sent to the existing TTS session
- **WHEN** I send a message in TTS mode **THEN** the message appears in the chat transcript and the model's audio response is streamed back
- **WHEN** the model responds in TTS mode **THEN** the chat transcript is updated with the model's response text

### 2.2. Voice Calling Mode (Speech In, Speech Out - STS Flow)
- **As a** user,
- **I want** to start a voice call by clicking a "Call" button,
- **so that** I can talk to Gemini-chan like calling a real person.

#### 2.2.1. Acceptance Criteria
- **WHEN** the application loads **THEN** a "Call" button is visible (not "Record" button)
- **WHEN** the application loads **THEN** no STS session is initialized (to conserve API usage)
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

### 2.7. Direct Main UI Landing with API Key Validation
- **As a** user,
- **I want** the application to land directly on the main UI instead of the settings menu,
- **so that** I can immediately see the chat interface and start interacting.

#### 2.7.1. Acceptance Criteria
- **WHEN** the application loads **THEN** the main UI (chat interface) is displayed immediately instead of the settings menu
- **WHEN** the application loads **THEN** the settings menu is hidden by default
- **WHEN** the application loads and API key is configured **THEN** the user can immediately start texting or calling
- **WHEN** the application loads and API key is not configured **THEN** the main UI is still shown but interactions are blocked

### 2.8. API Key Management with Settings Menu and Toast
- **As a** user,
- **I want** to be prompted to enter my API key when I try to use features that require it,
- **so that** I understand what's needed to start using the application.

#### 2.8.1. Acceptance Criteria
- **WHEN** I try to send my first text message and API key is empty **THEN** the settings menu opens automatically and a toast message prompts me to enter the API key
- **WHEN** I try to start a call and API key is empty **THEN** the settings menu opens automatically and a toast message prompts me to enter the API key
- **WHEN** the settings menu opens due to missing API key **THEN** a toast message displays "Please enter your Gemini API key to start chatting"
- **WHEN** I enter a valid API key in the settings menu **THEN** the settings menu closes automatically and I can proceed with my intended action
- **WHEN** I enter a valid API key and close the settings menu **THEN** the toast message disappears
- **WHEN** API key is already configured **THEN** no settings menu or toast appears during normal usage

### 2.9. Settings Menu Access
- **As a** user,
- **I want** to access a settings menu manually,
- **so that** I can configure the application to my preferences at any time.

#### 2.9.1. Acceptance Criteria
- **WHEN** the application is running **THEN** a settings icon or button is visible in the main interface
- **WHEN** I click the settings icon or button **THEN** the settings menu opens
- **WHEN** the settings menu is open **THEN** the UI is consistent with the existing application style

### 2.10. API Key Input and Validation
- **As a** user,
- **I want** to enter and validate my API key in the settings menu,
- **so that** I can authenticate with the service correctly.

#### 2.10.1. Acceptance Criteria
- **WHEN** the settings menu is open **THEN** an input field labeled "API Key" is displayed
- **WHEN** I type in the API key input field **THEN** the field's value updates
- **WHEN** I finish entering the API key **THEN** the system validates the key's format
- **WHEN** the API key is valid (starts with "AIzaSy" and is 39 characters total) **THEN** a visual confirmation appears
- **WHEN** the API key is empty **THEN** an error message "API key cannot be empty" is displayed
- **WHEN** the API key format is invalid **THEN** an error message "Invalid API key format" is displayed
- **WHEN** I start correcting invalid input **THEN** the error message clears immediately

### 2.11. API Key Persistence and Clipboard Support
- **As a** user,
- **I want** the application to save my API key and support clipboard pasting,
- **so that** I don't have to re-enter it every time and can input it quickly.

#### 2.11.1. Acceptance Criteria
- **WHEN** the API key is successfully validated **THEN** the system automatically saves it to browser's local storage
- **WHEN** I reopen the application **THEN** the saved API key is loaded from local storage and populates the field
- **WHEN** the settings menu is open **THEN** a "Paste" button is displayed next to the API key input field
- **WHEN** I click the "Paste" button **THEN** the system reads text from clipboard and populates the input field
- **WHEN** the settings menu is open **THEN** a "Get API Key" button or link is displayed
- **WHEN** I click the "Get API Key" button **THEN** the URL "https://aistudio.google.com/apikey" opens in a new browser tab

### 2.12. Call Transcript Layout Optimization
- **As a** user,
- **I want** the call transcript to have the same dimensions as the chat transcript and be positioned on the right side,
- **so that** the transcript is readable without covering the Live2D model area.

#### 2.12.1. Acceptance Criteria
- **WHEN** a call is active **THEN** the call transcript window appears with the same width as the chat window (400px)
- **WHEN** a call is active **THEN** the call transcript is positioned on the right side of the interface
- **WHEN** a call is active **THEN** the Live2D model area remains unoccupied by transcript windows for better visibility
- **WHEN** a call is active **THEN** the call transcript does not extend into the space under the Live2D model
- **WHEN** switching between texting and calling modes **THEN** both transcript windows maintain consistent dimensions and positioning