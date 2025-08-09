# Implementation Plan: Dual-Input Mode

- [ ] 1. Implement dual-context state management system
  - Create separate state properties for TTS and STS conversation histories
  - Implement `activeMode`, `textTranscript`, `callTranscript`, `textSession`, `callSession` state management
  - Add context preservation logic to maintain separate conversation histories
  - _Requirements: 2.3.1_

- [ ] 2. Create call transcript component for dynamic call interface
  - Implement `call-transcript.ts` component that displays call conversation history
  - Add visibility control based on call state (only visible during active calls)
  - Implement real-time transcript updates during voice conversations
  - _Requirements: 2.2.1, 2.4.1_

- [ ] 3. Update chat-view component for texting interface
  - Modify `chat-view.ts` to handle texting-specific transcript display
  - Add visibility control (hidden during calls, visible when call inactive)
  - Ensure component maintains texting conversation history independently
  - _Requirements: 2.1.1, 2.4.1_

- [ ] 4. Transform gdm-live-audio to call button interface
  - Replace "Record" button with "Call" button for messaging app simulation
  - Implement `call-start` and `call-end` events instead of record events
  - Add call state management (`isCallActive` property)
  - _Requirements: 2.2.1_

- [ ] 5. Implement TTS session management
  - Create `_initTextSession` method to connect to `gemini-2.5-flash-live-preview` model
  - Implement `_handleSendMessage` method for text message processing
  - Add text session lifecycle management (start, message handling, cleanup)
  - _Requirements: 2.1.1_

- [ ] 6. Implement STS session management
  - Create `_initCallSession` method to connect to `gemini-2.5-flash-exp-native-audio-thinking-dialog` model
  - Implement `_handleCallStart` and `_handleCallEnd` methods for voice call processing
  - Add call session lifecycle management with audio streaming
  - _Requirements: 2.2.1_

- [ ] 7. Implement dynamic transcript window visibility logic
  - Add logic to show chat-view when no call is active
  - Add logic to hide chat-view and show call-transcript during active calls
  - Implement smooth transitions between transcript windows
  - _Requirements: 2.4.1_

- [ ] 8. Wire up dual-context system in main application
  - Connect TTS session to chat-view component for texting flow
  - Connect STS session to call-transcript component for calling flow
  - Implement context switching logic that preserves both conversation histories
  - Pass appropriate `outputNode` to `live2d-visual` component from active session
  - _Requirements: 2.3.1, 2.5.1_

- [ ] 9. Implement independent reset functionality
  - Add reset capability for texting context that only clears text transcript
  - Add reset capability for calling context that only clears call transcript
  - Ensure reset of one mode doesn't affect the other mode's conversation history
  - _Requirements: 2.6.1_

- [ ] 10. Create comprehensive test suite for dual-context system
  - Write unit tests for dual-context state management logic
  - Write unit tests for transcript window visibility controls
  - Write integration tests for TTS and STS session management
  - Write end-to-end tests for texting flow with chat window visibility
  - Write end-to-end tests for calling flow with call transcript visibility
  - Write tests for context preservation across mode switches
  - _Requirements: All requirements_