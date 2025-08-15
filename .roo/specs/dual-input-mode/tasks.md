# Implementation Plan: Dual-Input Mode

## Current Status: ~80% Complete

### ✅ Completed Core Features
- **Dual-Context Architecture**: Fully implemented with separate TTS/STS session management
- **API Key Management**: Complete validation, persistence, and user flow (implemented via settings-management spec)
- **Session Management**: Proper isolation and lifecycle management
- **Real-time Call Transcription**: Bidirectional transcription working (user + model speech)
- **Initial Auto-scroll System**: Generic utility with smart scrolling behavior was implemented.
- **Initial Scroll-to-Bottom Button**: Squircle design matching call button aesthetics was implemented.
- **Controls Refactoring**: Modular controls-panel component eliminating circular imports
- **Layout Fixes**: Proper viewport constraints preventing page scrolling
- **Initial Configurable System Prompt**: SystemPromptManager and UI integration complete.

### 🎯 **Current Priority**
Implement the UI refactoring for scrollable views and the refined system prompt handling logic.

---

## Implementation Tasks

- [x] 1. UI Scaffolding: Implement the basic UI structure for the dual-input mode, including the main layout, chat view, call transcript, and settings menu.

- [x] 2. Implement Dual-Context State Management: Create and manage separate states for TTS and STS conversation histories.

- [x] 3. **FIXED** - Implement TTS Session Management: Handle the lifecycle of the text-to-speech session.

- [x] 4. Implement STS Session Management: Manage the speech-to-speech session.

- [x] 5. Wire up Dual-Context System: Connect the session management logic to the UI components.

- [x] 6. Implement API Key Management: Add API key validation, on-demand prompts, and persistence.

- [x] 7. Implement Dedicated Reset Buttons: Refactor the reset functionality to use dedicated buttons.

- [x] 8. API Contract Compliance: Refactor session handling to use a SessionManager pattern.

- [x] 11. Implement Real-time Call Transcription.

- [x] 14. Verify Ephemeral Call Session Implementation.

- [x] 15. Implement Auto-scroll for Call Transcript (Initial version).

- [x] 16. Implement Scroll-to-Bottom Button System (Initial version).

- [x] 17. Refactor Controls into Modular Component.

- [x] 18. **CODE REVIEW** - Refactor Session Manager Callbacks to Eliminate Duplication.

- [x] 19. **CODE REVIEW** - Improve Layout Resilience and CSS Constraints.

- [x] 20. **Refine Configurable System Prompt Logic**
  - Requirements: 2.12.1
  - [x] 20.1. In [`src/system-prompt-manager.ts`](src/system-prompt-manager.ts), add debouncing to the `setSystemPrompt` method to prevent excessive writes to `localStorage`.
    - Ref: Design 3.8
  - [x] 20.2. In [`index.tsx`](index.tsx), update the `system-prompt-changed` event handler to:
    - Disconnect the active `TextSessionManager`.
    - Clear the `textTranscript` state.
    - Ensure the session is only re-initialized on the next user message, not immediately.
    - Ref: Design 3.8, Requirement 2.12.1

- [x] 21. **Implement Scrollability in Chat View by Reusing Existing Logic**
  - Requirements: 2.13.1, 2.8.1, 2.9.1
  - [x] 21.1. Copy the stable auto-scroll and scroll-to-bottom logic from `call-transcript.ts` directly into `chat-view.ts`.
    - This includes the `TranscriptAutoScroll` integration, scroll container setup, and event handling for `scroll-state-changed`.
    - The goal is to duplicate the known stable implementation.
    - Ref: Design 3.4, 7.1, 7.2
  - [x] 21.2. Adapt the copied logic in `chat-view.ts` to work with the text transcript and its lifecycle.
    - Ref: Requirement 2.13.1
  - [x] 21.3. Implement the mirrored scroll-to-bottom button for the chat view.
    - In `index.tsx`, manage the state for the chat view's scroll-to-bottom button.
    - In `index.css`, add styles to position the chat's scroll-to-bottom button on the left side of the controls panel.
    - Ref: Design 7.3

- [x] 9. Testing: Write unit and integration tests for all new functionality. (DEFERRED)
  - Sub-tasks:
    - [x] 9.1. Test dual-context state management.
    - [x] 9.2. Test TTS and STS session management (add STS text transcript test). (DEFERRED)
    - [x] 9.3. Test API key validation, settings auto-close, and pending action continuation.
    - [x] 9.4. Test dedicated reset button functionality via events.
    - [x] 9.5. Test SessionManager architecture integration paths.
    - [x] 9.6. Add unit tests for `SummarizationService`. (DEFERRED)
    - [x] 9.7. Add unit tests for `tab-view` and `call-history-view`. (DEFERRED)
    - [x] 9.8. Add integration tests for the call summarization and history flow. (DEFERRED)
    - [x] 9.9. Add unit tests for `SystemPromptManager` including debounce logic. (DEFERRED)
    - [x] 9.10. Add unit tests for `BaseTranscriptVew` and the scroll interaction. (DEFERRED)

- [x] 12. Implement Tabbed UI System
   - Requirements: 2.10.1
   - [x] 12.1. Create `tab-view.ts` component
   - [x] 12.2. Create `call-history-view.ts` component
   - [x] 12.3. Update main component for tabbed interface

- [x] 13. Implement Call Summarization Service with Ephemeral Transcript Clearing
   - Requirements: 2.11.1, 2.3.1
   - [x] 13.1. Create `SummarizationService` class
   - [x] 13.2. Integrate summarization into call lifecycle with transcript clearing
   - [x] 13.3. Implement call history persistence


- [x] 22. **Handle Edge Case**: When a call summary is inserted into the chat while no TTS session is active, it should act like sending a new message.
  - Requirements: 2.11.1
  - [x] 22.1. In `index.tsx`, ensure the `_startTtsFromSummary` handler correctly initiates a new TTS session with the summary content if no session is active. This should mirror the behavior of sending the first message in the chat.
    - Ref: Design 3.1
