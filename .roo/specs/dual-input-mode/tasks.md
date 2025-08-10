# Implementation Plan: Dual-Input Mode

- [x] 1. UI Scaffolding: Implement the basic UI structure for the dual-input mode, including the main layout, chat view, call transcript, and settings menu.
  - Status: Complete

- [x] 2. Implement Dual-Context State Management: Create and manage separate states for TTS and STS conversation histories (textTranscript, callTranscript, activeMode preserved across switches).
  - Requirements: 2.3.1

- [x] 3. Implement TTS Session Management: Handle the lifecycle of the text-to-speech session, including lazy initialization and message processing via TextSessionManager; audio playback to isolated text output node; transcript updates.
  - Requirements: 2.1.1

- [ ] 4. Implement STS Session Management: Manage the speech-to-speech session, including call initiation, audio streaming, audio playback, and session termination.
  - Requirements: 2.2.1
  - [x] 4.1. Call start/stop and microphone streaming to the session.
  - [x] 4.2. Audio playback pipeline via SessionManager and isolated call output node.
  - [ ] 4.3. Enable text modality for STS responses and update callTranscript in real time.

- [ ] 5. Wire up Dual-Context System: Connect the session management logic to the UI components and ensure seamless context switching.
  - Requirements: 2.3.1, 2.5.1
  - [x] 5.1. Active-mode toggling shows/hides chat and call transcript windows.
  - [x] 5.2. Live2D animation ties to the active session’s output node and continues seamlessly on switches.
  - [ ] 5.3. Call transcript receives model text during calls (pending 4.3).

- [ ] 6. Implement API Key Management: Add API key validation, on-demand prompts, and persistence using localStorage.
  - Requirements: 2.8.1, 2.10.1, 2.11.1
  - [x] 6.1. Validate API key format (starts with "AIzaSy" and 39 chars).
  - [x] 6.2. On-demand settings menu open and toast prompt when key missing on first action.
  - [x] 6.3. Persist to localStorage; provide Paste and Get API Key controls.
  - [ ] 6.4. Auto-close settings and proceed with pending action on valid key (dispatch api-key-saved; index listens and continues).
  - [ ] 6.5. Display validation errors in the settings UI beneath the input.
  - [ ] 6.6. Align toast copy to: "Please enter your Gemini API key to start chatting".

- [ ] 7. Implement Dedicated Reset Buttons: Refactor the reset functionality to use dedicated buttons in each view.
  - Requirements: 2.6.1
  - [ ] 7.1. Refactor gdm-live-audio to remove long-press functionality.
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

- [ ] 10. UX Consistency Fixes
  - [x] 10.1. Hide settings during active calls (disable or hide settings button while isCallActive).
  - [ ] 10.2. Standardize API key prompt copy across app (use the spec string in settings-triggered toasts).
  - [x] 10.3. Handle rate-limit UX during calls: surface a non-silent failure when reusing an overloaded session (banner/toast/transcript notice).
