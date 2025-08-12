# Feature: Dual-Input Mode

> **Note:** This document outlines the complete feature requirements. The initial implementation phase focuses on building the UI scaffolding; the backend logic and session management are pending.

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
- **WHEN** a call is active AND a request is rate-limited **THEN** a toast appears explaining the rate limit and no new audio is queued

### 2.3. Context Management
- **As a** user,
- **I want** my text conversations to be preserved independently from voice calls,
- **so that** I can switch between texting and fresh voice calls without losing my chat history.

#### 2.3.1. Acceptance Criteria
- **WHEN** I switch from texting to calling **THEN** the texting context is preserved but not shared with the calling session
- **WHEN** I end a call **THEN** the call's context is discarded and not preserved.
- **WHEN** I hang up a call **THEN** the call transcript is immediately cleared from the display for an ephemeral experience.
- **WHEN** a call is successfully summarized **THEN** the call transcript is cleared from the display and only the summary is retained in call history.
- **WHEN** I start a new call **THEN** the call begins with a fresh, empty context and completely empty transcript display, independent of any previous calls or text chats.
- **WHEN** I click the "Call" button to start a new call **THEN** the call transcript UI shows no previous messages and starts completely blank.
- **WHEN** I return to the text messaging view after a call **THEN** the previous text conversation history is restored.
- **WHEN** switching between modes **THEN** no confirmation dialog appears

### 2.4. Dynamic Transcript Windows
- **As a** user,
- **I want** transcript windows to dynamically appear based on the active mode,
- **so that** I have a clear view of the relevant conversation without clutter.

#### 2.4.1. Acceptance Criteria
- **WHEN** no call is active **THEN** only the chat window (texting interface) is visible
- **WHEN** a call becomes active **THEN** the chat window is hidden and the call transcript window appears
- **WHEN** a call ends **THEN** the call transcript window is hidden and the chat window reappears
- **WHEN** the call transcript window is visible **THEN** it displays real-time transcription of the voice conversation

### 2.8. Smart Auto-scroll Transcript Behavior
- **As a** user,
- **I want** transcript windows to automatically scroll when I'm following the conversation, but not interrupt me when I'm reading past content,
- **so that** I can stay caught up with new messages while maintaining the ability to review past conversation.

#### 2.8.1. Acceptance Criteria
- **WHEN** the first message appears in a transcript **THEN** the transcript automatically scrolls to show the initial content
- **WHEN** I am at or near the bottom of the transcript and new messages arrive **THEN** the transcript automatically scrolls to show the latest messages
- **WHEN** I manually scroll up to read older messages **THEN** automatic scrolling is disabled to avoid interrupting my reading
- **WHEN** I scroll back to the bottom (or use the scroll-to-bottom button) **THEN** automatic scrolling resumes for new messages
- **WHEN** a transcript window becomes visible with existing content **THEN** it automatically scrolls to the bottom to show the most recent content
- **WHEN** multiple messages arrive rapidly **THEN** scrolling is optimized to avoid excessive animation

### 2.9. Scroll-to-Bottom Button
- **As a** user,
- **I want** a scroll-to-bottom button that appears when I scroll away from the latest messages,
- **so that** I can quickly return to the current conversation.

#### 2.9.1. Acceptance Criteria
- **WHEN** I scroll up from the bottom of a transcript **THEN** a scroll-to-bottom button appears in the controls area
- **WHEN** I am at or near the bottom of a transcript **THEN** the scroll-to-bottom button is hidden or dimmed
- **WHEN** new messages arrive while I'm scrolled away from the bottom **THEN** the button shows a count of new messages
- **WHEN** I click the scroll-to-bottom button **THEN** the transcript smoothly scrolls to the bottom and the button disappears
- **WHEN** I am in a voice call **THEN** the scroll-to-bottom button uses the same squircle design as other control buttons
- **WHEN** I am not in a call **THEN** the scroll-to-bottom button is not visible

### 2.5. Model Animation
- **As a** user,
- **I want** the model to animate in response to both text and voice interactions,
- **so that** the experience is more engaging and immersive.

#### 2.5.1. Acceptance Criteria
- **WHEN** the model is speaking in either TTS or STS mode **THEN** the model's lips are synchronized with the audio
- **WHEN** the model is listening or idle **THEN** the model exhibits subtle idle animations
- **WHEN** switching between modes **THEN** the model animation continues seamlessly

### 2.6. Dedicated Conversation Reset
- **As a** user,
- **I want** to use separate, dedicated buttons to reset the text and call conversations,
- **so that** I can clearly and intentionally clear the context for each mode.

#### 2.6.1. Acceptance Criteria
- **GIVEN** I am in the text messaging view **WHEN** I click the "Clear conversation" button in the header **THEN** the text transcript and its corresponding context are cleared.
- **GIVEN** I am in the voice calling view **WHEN** I click the "Clear call history" button in the header **THEN** the call transcript is cleared from the display.
- **WHEN** I reset the text context **THEN** the call context remains unaffected.

### 2.12. Configurable System Prompt
- **As a** user,
- **I want** to customize Gemini-chan's personality and behavior through a configurable system prompt,
- **so that** I can personalize the AI character to my preferences across both text and voice modes.

#### 2.12.1. Acceptance Criteria
- **GIVEN** I am in the settings menu, **WHEN** I modify the system prompt, **THEN** the changes are saved with a debounce mechanism and applied to any new text or voice session.
- **GIVEN** a text session is active **WHEN** the system prompt is changed **THEN** the text session is disconnected.
- **GIVEN** a text session has been disconnected due to a prompt change **WHEN** I send a new message **THEN** the session reconnects automatically.
- **GIVEN** the system prompt is changed **THEN** the text chat transcript is cleared.
- **GIVEN** I am in the settings menu, **WHEN** I click the "Reset to Default" button, **THEN** the system prompt reverts to the default Gemini-chan personality.
- **GIVEN** the application loads, **WHEN** no custom prompt is saved, **THEN** the default Gemini-chan personality is used for all sessions.
- **GIVEN** a custom system prompt is saved, **WHEN** the application loads, **THEN** the saved prompt is used for all sessions.

### 2.7. Call Transcript Layout Optimization
- **As a** user,
- **I want** the call transcript to have the same dimensions as the chat transcript and be positioned on the right side,
- **so that** the transcript is readable without covering the Live2D model area.

#### 2.7.1. Acceptance Criteria
- **WHEN** a call is active **THEN** the call transcript window appears with the same width as the chat window (400px)
- **WHEN** a call is active **THEN** the call transcript is positioned on the right side of the interface
- **WHEN** a call is active **THEN** the Live2D model area remains unoccupied by transcript windows for better visibility
- **WHEN** a call is active **THEN** the call transcript does not extend into the space under the Live2D model
- **WHEN** switching between texting and calling modes **THEN** both transcript windows maintain consistent dimensions and positioning

### 2.10. Tabbed Chat Interface
- **As a** user,
- **I want** the left-side panel to have tabs for "Chat" and "Call History",
- **so that** I can easily switch between my ongoing text conversation and my past call summaries.

#### 2.10.1. Acceptance Criteria
- **GIVEN** the application has loaded, **THEN** the left-side panel displays two tabs: "Chat" and "Call History".
- **GIVEN** the "Chat" tab is selected, **THEN** the main text messaging interface is displayed.
- **GIVEN** the "Call History" tab is selected, **THEN** a list of past call summaries is displayed.
- **WHEN** I switch between tabs, **THEN** the content of the panel updates instantly without a page reload.

### 2.11. Call Summarization and History
- **As a** user,
- **I want** to see a summarized history of my past calls in a dedicated tab,
- **so that** I can review them and start new conversations based on them.

#### 2.11.1. Acceptance Criteria
- **GIVEN** a call has ended, **WHEN** I hang up, **THEN** a background API call is made to a `gemini-flash-lite` model to summarize the call transcript.
- **GIVEN** a call summary is generated, **THEN** it is added to the "Call History" tab.
- **GIVEN** I am viewing the "Call History" tab, **WHEN** I click on a call summary, **THEN** the summary content is used to start a new TTS session in the "Chat" tab.

### 2.13. Scrollable Text Chat
- **As a** user,
- **I want** the text chat to be a scrollable container with auto-scrolling,
- **so that** I can view my entire conversation history without the UI breaking.

#### 2.13.1. Acceptance Criteria
- **GIVEN** the text chat has more messages than can be displayed at once, **WHEN** new messages are added, **THEN** the chat automatically scrolls to the bottom to show the latest message.
- **GIVEN** I have scrolled up in the text chat, **WHEN** a new message arrives, **THEN** auto-scrolling is paused to avoid interrupting me.
- **GIVEN** I have scrolled up in the text chat, **THEN** a "scroll-to-bottom" button appears.
- **GIVEN** I click the "scroll-to-bottom" button, **THEN** the chat scrolls to the most recent message and the button disappears.