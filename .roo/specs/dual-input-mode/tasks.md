# Implementation Plan: Dual-Input Mode

## 1. State Management and Session Control
- [ ] 1.1. In [`index.tsx`](index.tsx), implement the state management for `activeSession`, `transcript`, and `outputNode`.
  - Ref: Design 3.1
- [ ] 1.2. In [`index.tsx`](index.tsx), create the `_initTextSession` method to connect to the `gemini-2.5-flash-live-preview` model.
  - Ref: Requirement 2.1.1
- [ ] 1.3. In [`index.tsx`](index.tsx), create the `_initVoiceSession` method to connect to the `gemini-2.5-flash-exp-native-audio-thinking-dialog` model.
  - Ref: Requirement 2.2.1
- [ ] 1.4. In [`index.tsx`](index.tsx), implement the `_handleSendMessage` method to send text messages to the active session.
  - Ref: Requirement 2.1.1
- [ ] 1.5. In [`index.tsx`](index.tsx), implement the `_handleRecord` method to start and stop voice sessions.
  - Ref: Requirement 2.2.1, 2.3.1

## 2. UI Components
- [ ] 2.1. In [`chat-view.ts`](chat-view.ts), ensure the component correctly displays the `transcript` property.
  - Ref: Requirement 2.1.1
- [ ] 2.2. In [`chat-view.ts`](chat-view.ts), ensure the `send-message` event is dispatched with the correct message payload.
  - Ref: Requirement 2.1.1
- [ ] 2.3. In [`gdm-live-audio.ts`](gdm-live-audio.ts), ensure the `record-start` and `record-stop` events are dispatched correctly.
  - Ref: Requirement 2.2.1
- [ ] 2.4. In [`index.tsx`](index.tsx), conditionally render the text input and record button based on the `activeSession` state.
  - Ref: Requirement 2.2.1, 2.3.1

## 3. Model Animation
- [ ] 3.1. In [`index.tsx`](index.tsx), pass the `outputNode` to the `live2d-visual` component.
  - Ref: Design 3.1, 3.4
- [ ] 3.2. In [`live2d-model.ts`](live2d/live2d-model.ts), ensure the `audio-mapper` is initialized with the `outputNode`.
  - Ref: Design 3.5, 3.6
- [ ] 3.3. In [`live2d-model.ts`](live2d/live2d-model.ts), ensure the `idle-eye-focus` is active when the model is not speaking.
  - Ref: Requirement 2.4.1

## 4. Testing
- [ ] 4.1. Create unit tests for the state management logic in [`index.tsx`](index.tsx).
  - Ref: Design 6
- [ ] 4.2. Create unit tests for the event emission in [`chat-view.ts`](chat-view.ts) and [`gdm-live-audio.ts`](gdm-live-audio.ts).
  - Ref: Design 6
- [ ] 4.3. Create an integration test to verify the communication between [`index.tsx`](index.tsx) and the child components.
  - Ref: Design 6
- [ ] 4.4. Create an end-to-end test to simulate a full text-based conversation.
  - Ref: Design 6
- [ ] 4.5. Create an end-to-end test to simulate a full voice-based conversation.
  - Ref: Design 6