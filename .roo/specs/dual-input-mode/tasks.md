# Implementation Plan: Dual-Input Mode

## Current Status: ~75% Complete

### ✅ Completed Core Features
- **Dual-Context Architecture**: Fully implemented with separate TTS/STS session management
- **API Key Management**: Complete validation, persistence, and user flow
- **Session Management**: Proper isolation and lifecycle management
- **Real-time Call Transcription**: Bidirectional transcription working (user + model speech)
- **Auto-scroll System**: Generic utility with smart scrolling behavior
- **Scroll-to-Bottom Button**: Squircle design matching call button aesthetics
- **Controls Refactoring**: Modular controls-panel component eliminating circular imports
- **Layout Fixes**: Proper viewport constraints preventing page scrolling

### 🚨 **CRITICAL ISSUES - Core Functionality Broken**
- **Text Messaging Interface**: Chat input is non-functional (cannot click/interact)

### ❌ Missing Features
- **Tabbed UI System**: Tab view and call history components not implemented
- **Call Summarization**: Service and history functionality missing
- **Complete Test Coverage**: Missing tests for unimplemented features

### 🎯 **Current Priority**
Implement tabbed UI system and call summarization to complete the dual-input mode feature.

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
  - [x] 11.1. Update `CallSessionManager` to capture and process model text responses during calls
    - Added `outputAudioTranscription: {}` and `inputAudioTranscription: {}` to config
    - Extended `onmessage` callback to extract text from both user and model transcription
    - Added callback parameter to update call transcript in real-time with author information
  - [x] 11.2. Wire call transcript updates to the main component
    - Added `updateCallTranscript(text: string, author: "user" | "model")` method
    - Connected the method to `CallSessionManager` during initialization
    - Implemented proper Lit state management with new array/object references
  - [x] 11.3. Test real-time call transcription functionality
    - Verified bidirectional transcription (both user and model speech)
    - Confirmed transcript updates work without interfering with audio playback
    - Real-time turn-based conversation display working perfectly

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

- [x] 15. Implement Auto-scroll for Call Transcript
  - Requirements: 2.15.1 (auto-scroll transcript behavior)
  - [x] 15.1. Create generic auto-scroll utility system
    - Implemented `TranscriptAutoScroll` class with smart scrolling logic
    - Added user-aware scrolling that only scrolls when user is near bottom
    - Implemented performance optimizations with `requestAnimationFrame`
    - Added support for rapid update detection and smooth scrolling
  - [x] 15.2. Fix transcript container height constraints
    - Resolved flexbox layout issues preventing scrollable areas
    - Added `height: calc(100vh - 120px)` for fixed height containers
    - Fixed `min-height: 0` flexbox constraint for proper overflow behavior
  - [x] 15.3. Integrate auto-scroll into transcript components
    - Updated both `call-transcript.ts` and `chat-view.ts` to use generic utility
    - Added visibility change handling for proper scroll behavior
    - Implemented consistent scrolling across all transcript components

- [x] 16. Implement Scroll-to-Bottom Button System
  - Requirements: 2.16.1 (scroll-to-bottom button)
  - [x] 16.1. Create scroll-to-bottom button functionality
    - Added smart visibility logic that appears when user scrolls away from bottom
    - Implemented new message counter showing unread messages
    - Added smooth scroll animation when button is clicked
  - [x] 16.2. Design scroll-to-bottom button with squircle styling
    - Matched call button design with consistent visual language
    - Positioned in main controls area above call button
    - Added hover effects and proper accessibility attributes
  - [x] 16.3. Integrate scroll state management
    - Added event communication between call-transcript and main component
    - Implemented `scroll-state-changed` events for real-time button updates
    - Connected scroll functionality to controls-panel component

- [x] 17. Refactor Controls into Modular Component
  - [x] 17.1. Create `controls-panel.ts` component
    - Extracted all control buttons into dedicated component
    - Implemented event-based communication with parent component
    - Added consistent squircle styling for all buttons
  - [x] 17.2. Eliminate circular import issues
    - Moved controls logic out of main component
    - Improved code organization and separation of concerns
    - Made controls reusable and easier to maintain
  - [x] 17.3. Update main component integration
    - Replaced old controls HTML with new controls-panel component
    - Connected all control events (settings, scroll, call start/end)
    - Maintained all existing functionality with improved architecture

- [ ] 18. **CODE REVIEW** - Refactor Session Manager Callbacks to Eliminate Duplication
  - [ ] 18.1. Consolidate common callback logic in BaseSessionManager
    - Move rate-limit detection logic to BaseSessionManager.getCallbacks()
    - Consolidate onopen, onerror, and onclose handlers with common logic
    - Ensure child classes can call super.getCallbacks() and only override onmessage
  - [ ] 18.2. Update CallSessionManager to use consolidated callbacks
    - Remove duplicated rate-limit detection code
    - Call super.getCallbacks() and only override onmessage for transcription logic
    - Maintain existing functionality while reducing code duplication
  - [ ] 18.3. Update TextSessionManager to use consolidated callbacks
    - Ensure TextSessionManager also benefits from consolidated callback logic
    - Remove any duplicated error handling or rate-limit detection
    - Verify all session managers follow DRY principle

- [ ] 19. **CODE REVIEW** - Improve Layout Resilience and CSS Constraints
  - [ ] 19.1. Review and improve call transcript layout constraints
    - Ensure robust CSS constraints that work across different viewport sizes
    - Fix any layout issues with the `height: calc(100vh - 120px)` approach
    - Add fallback constraints for edge cases
  - [ ] 19.2. Improve overall layout resilience
    - Review flexbox constraints and ensure proper min-height/max-height handling
    - Test layout behavior with different content sizes and viewport dimensions
    - Ensure consistent behavior across different browsers
