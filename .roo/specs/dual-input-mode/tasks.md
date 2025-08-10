# Implementation Plan: Dual-Input Mode

- [x] 1. **UI Scaffolding**: Implement the basic UI structure for the dual-input mode, including the main layout, chat view, call transcript, and settings menu.
  - _Status: Complete_

- [ ] 2. **Implement Dual-Context State Management**: Create and manage separate states for TTS and STS conversation histories.
  - _Requirements: 2.3.1_

- [ ] 3. **Implement TTS Session Management**: Handle the lifecycle of the text-to-speech session, including lazy initialization and message processing.
  - _Requirements: 2.1.1_

- [ ] 4. **Implement STS Session Management**: Manage the speech-to-speech session, including call initiation, audio streaming, and session termination.
  - _Requirements: 2.2.1_

- [ ] 5. **Wire up Dual-Context System**: Connect the session management logic to the UI components and ensure seamless context switching.
  - _Requirements: 2.3.1, 2.5.1_

- [ ] 6. **Implement API Key Management**: Add API key validation, on-demand prompts, and persistence using `localStorage`.
  - _Requirements: 2.8.1, 2.10.1, 2.11.1_

- [ ] 7. **Implement Dedicated Reset Buttons**: Refactor the reset functionality to use dedicated buttons in each view.
  - _Requirements: 2.6.1_
  - [ ] 7.1. **Refactor `gdm-live-audio` to remove long-press functionality.**
    - Remove all code related to the long-press timer, state, and event dispatch.
    - The component should now only be responsible for emitting `call-start` and `call-end` events.
  - [ ] 7.2. **Update `index.tsx` to handle dedicated reset events.**
    - Remove the `_handleResetContext` method.
    - Implement `@listen("reset-text")` and `@listen("reset-call")` event listeners to call the appropriate reset methods.
  - [ ] 7.3. **Implement the "Clear conversation" button in `chat-view.ts`.**
    - Add a button that dispatches the `reset-text` custom event.
  - [ ] 7.4. **Implement the "Clear call history" button in `call-transcript.ts`.**
    - Add a button that dispatches the `reset-call` custom event.

- [ ] 8. **API Contract Compliance**: Refactor session handling to use a `SessionManager` pattern, ensuring audio resources are properly isolated.
  - _Requirements: 2.3.1, 2.5.1_

- [ ] 9. **Testing**: Write unit and integration tests for all new functionality.
  - _Sub-tasks:_
    - [ ] 9.1. Test dual-context state management.
    - [ ] 9.2. Test TTS and STS session management.
    - [ ] 9.3. Test API key validation and settings menu.
    - [ ] 9.4. Test dedicated reset button functionality.
    - [ ] 9.5. Test session manager architecture.