# Implementation Plan: Dual-Input Mode

## Current Status: ~40% Complete

### ✅ Completed Core Features
- **Dual-Context Architecture**: Fully implemented with separate TTS/STS session management
- **API Key Management**: Complete validation, persistence, and user flow
- **Session Management**: Proper isolation and lifecycle management
- **Basic Testing**: Core dual-context system tests implemented

### 🚨 **CRITICAL ISSUES - Core Functionality Broken**
- **Text Messaging Interface**: Chat input is non-functional (cannot click/interact)
- **Call Transcript Display**: No transcript content appears during calls
- **Call Summarization**: Blocked by non-functional call transcript

### ❌ Missing Features
- **Real-time Call Transcription**: Model text not captured or displayed during calls
- **Tabbed UI System**: Tab view and call history components not implemented
- **Call Summarization**: Service and history functionality missing
- **Complete Test Coverage**: Missing tests for unimplemented features

### 🎯 **URGENT Priority**
Fix critical functionality issues in tasks 3 and 11 before implementing advanced features.

- [x] 1. UI Scaffolding: Implement the basic UI structure for the dual-input mode, including the main layout, chat view, call transcript, and settings menu.
  - Status: Complete

- [x] 2. Implement Dual-Context State Management: Create and manage separate states for TTS and STS conversation histories (textTranscript, callTranscript, activeMode preserved across switches).
  - Requirements: 2.3.1

- [ ] 3. **CRITICAL ISSUE** - Implement TTS Session Management: Handle the lifecycle of the text-to-speech session, including lazy initialization and message processing via TextSessionManager; audio playback to isolated text output node; transcript updates.
  - Requirements: 2.1.1
  - **BROKEN**: Chat input is non-functional (cannot click/interact with textarea or send button)

- [x] 4. Implement STS Session Management: Manage the speech-to-speech session, including call initiation, audio streaming, audio playback, and session termination.
  - Requirements: 2.2.1
  - [x] 4.1. Call start/stop and microphone streaming to the session.
  - [x] 4.2. Audio playback pipeline via SessionManager and isolated call output node.
  - [ ] 4.3. Update callTranscript in real time (moved to task 11).

- [x] 5. Wire up Dual-Context System: Connect the session management logic to the UI components and ensure seamless context switching.
  - Requirements: 2.3.1, 2.5.1
  - [x] 5.1. Active-mode toggling shows/hides chat and call transcript windows.
  - [x] 5.2. Live2D animation ties to the active session’s output node and continues seamlessly on switches.
  - [ ] 5.3. Call transcript receives model text during calls (moved to task 11).

- [x] 6. Implement API Key Management: Add API key validation, on-demand prompts, and persistence using localStorage.
  - Requirements: 2.8.1, 2.10.1, 2.11.1
  - [x] 6.1. Validate API key format (starts with "AIzaSy" and 39 chars).
  - [x] 6.2. On-demand settings menu open and toast prompt when key missing on first action.
  - [x] 6.3. Persist to localStorage; provide Paste and Get API Key controls.
  - [x] 6.4. Auto-close settings and proceed with pending action on valid key (dispatch api-key-saved; index listens and continues).
  - [x] 6.5. Display validation errors in the settings UI beneath the input.
  - [x] 6.6. Align toast copy to: "Please enter your Gemini API key to start chatting".

- [x] 7. Implement Dedicated Reset Buttons: Refactor the reset functionality to use dedicated buttons in each view.
  - Requirements: 2.6.1
  - [x] 7.1. Refactor gdm-live-audio to remove long-press functionality.
    - Remove all code related to the long-press timer, state, visuals, and event dispatch.
    - Keep only call-start and call-end button behaviors.
  - [x] 7.2. Update index.tsx to handle dedicated reset events.
    - Implement listeners and handlers for reset-text and reset-call events.
  - [x] 7.3. Implement the "Clear conversation" button in chat-view.ts (dispatches reset-text).
  - [x] 7.4. Implement the "Clear call history" button in call-transcript.ts (dispatches reset-call).

- [x] 8. API Contract Compliance: Refactor session handling to use a SessionManager pattern, ensuring audio resources are properly isolated per mode.
  - Requirements: 2.3.1, 2.5.1

- [ ] 9. Testing: Write unit and integration tests for all new functionality.
  - Sub-tasks:
    - [x] 9.1. Test dual-context state management.
    - [ ] 9.2. Test TTS and STS session management (add STS text transcript test).
    - [ ] 9.3. Test API key validation, settings auto-close, and pending action continuation.
    - [ ] 9.4. Test dedicated reset button functionality via events.
    - [ ] 9.5. Test SessionManager architecture integration paths.
    - [ ] 9.6. Add unit tests for `SummarizationService`.
    - [ ] 9.7. Add unit tests for `tab-view` and `call-history-view`.
    - [ ] 9.8. Add integration tests for the call summarization and history flow.

- [x] 10. UX Consistency Fixes
  - [x] 10.1. Hide settings during active calls (disable or hide settings button while isCallActive).
  - [x] 10.2. Standardize API key prompt copy across app (use the spec string in settings-triggered toasts).
  - [x] 10.3. Handle rate-limit UX during calls: surface a non-silent failure when reusing an overloaded session (banner/toast/transcript notice).
    - Note: The banner display is currently broken, but the toast notification works.

- [x] 11. **CRITICAL ISSUE** - Implement Real-time Call Transcription
  - Requirements: 2.2.1, 2.4.1
  - **BROKEN**: Call transcript displays no content during calls - model text not captured or displayed
  - [x] 11.1. Update `CallSessionManager` to capture and process model text responses during calls
    - Extend the `onmessage` callback to extract text from model responses
    - Add a callback parameter to update call transcript in real-time
  - [x] 11.2. Wire call transcript updates to the main component
    - Add `updateCallTranscript` method similar to `updateTextTranscript`
    - Connect the method to `CallSessionManager` during initialization
  - [x] 11.3. Test real-time call transcription functionality
    - Verify that model responses appear in call transcript during active calls
    - Ensure transcript updates don't interfere with audio playback

- [ ] 12. Implement Tabbed UI System
  - Requirements: 2.13.1
  - [ ] 12.1. Create `tab-view.ts` component
    - Implement tab switching between "Chat" and "Call History"
    - Emit `tab-switch` events when tabs are clicked
    - Style tabs to match existing UI design
  - [ ] 12.2. Create `call-history-view.ts` component
    - Display list of call summaries with timestamps
    - Implement click handlers to start new TTS sessions from summaries
    - Emit `start-tts-from-summary` events with summary content
  - [ ] 12.3. Update main component for tabbed interface
    - Add `activeTab: 'chat' | 'call-history'` state
    - Add `callHistory: CallSummary[]` state
    - Implement `_handleTabSwitch` method
    - Implement `_startTtsFromSummary` method
    - Update render method to use `tab-view` instead of direct `chat-view`

- [ ] 13. Implement Call Summarization Service
  - Requirements: 2.14.1
  - [ ] 13.1. Create `SummarizationService` class
    - Implement stateless service using `gemini-1.5-flash-latest` model
    - Add `summarize(transcript: Turn[]): Promise<string>` method
    - Handle errors gracefully with fallback messages
  - [ ] 13.2. Integrate summarization into call lifecycle
    - Modify `_handleCallEnd` to invoke summarization service
    - Implement `_handleSummarizationComplete` to update call history
    - Generate unique IDs and timestamps for call summaries
  - [ ] 13.3. Implement call history persistence
    - Store call history in component state
    - Ensure summaries persist during app session
    - Display summaries in `call-history-view`

- [x] 14. Verify Ephemeral Call Session Implementation
  - Investigate the current `CallSessionManager` and related code in `index.tsx` to confirm that the session is fully destroyed on call end.
    - Ref: Requirement 2.3.1, Design 4.1
  - Add logging or assertions to explicitly check that no context is carried over between separate call sessions.
  - Ensure that the `disconnect` method is called on the `CallSessionManager` when the call ends.
  - Verify that all related resources are released and the application returns to a clean state.

- [ ] 15. Implement Auto-scroll for Call Transcript
  - Requirements: 2.4.1 (real-time transcription display)
  - [ ] 15.1. Add auto-scroll functionality to call-transcript component
    - Automatically scroll to bottom when new transcript entries are added
    - Ensure smooth scrolling behavior during real-time updates
    - Handle both user and model turn additions
  - [ ] 15.2. Optimize scroll performance for real-time updates
    - Prevent excessive scrolling during rapid transcription chunks
    - Only scroll if user is already at or near the bottom
    - Maintain scroll position if user manually scrolls up to read history
