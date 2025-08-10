# Implementation Plan: Dual-Input Mode

- [x] 1. Implement dual-context state management system
  - Create separate state properties for TTS and STS conversation histories
  - Implement `activeMode`, `textTranscript`, `callTranscript`, `textSession`, `callSession` state management
  - Add context preservation logic to maintain separate conversation histories
  - _Requirements: 2.3.1_

- [x] 2. Create call transcript component for dynamic call interface
  - Implement `call-transcript.ts` component that displays call conversation history
  - Add visibility control based on call state (only visible during active calls)
  - Implement real-time transcript updates during voice conversations
  - _Requirements: 2.2.1, 2.4.1_

- [x] 3. Update chat-view component for texting interface
  - Modify `chat-view.ts` to handle texting-specific transcript display
  - Add visibility control (hidden during calls, visible when call inactive)
  - Ensure component maintains texting conversation history independently
  - _Requirements: 2.1.1, 2.4.1_

- [x] 4. Transform gdm-live-audio to call button interface
  - Replace "Record" button with "Call" button for messaging app simulation
  - Implement `call-start` and `call-end` events instead of record events
  - Add call state management (`isCallActive` property)
  - _Requirements: 2.2.1_

- [x] 5. Implement TTS session management
  - Create `_initTextSession` method to connect to `gemini-2.5-flash-live-preview` model
  - Implement `_handleSendMessage` method for text message processing
  - Add text session lifecycle management (start, message handling, cleanup)
  - _Requirements: 2.1.1_

- [x] 6. Implement STS session management
  - Create `_initCallSession` method to connect to `gemini-2.5-flash-exp-native-audio-thinking-dialog` model
  - Implement `_handleCallStart` and `_handleCallEnd` methods for voice call processing
  - Add call session lifecycle management with audio streaming
  - _Requirements: 2.2.1_

- [x] 7. Implement dynamic transcript window visibility logic
  - Add logic to show chat-view when no call is active
  - Add logic to hide chat-view and show call-transcript during active calls
  - Implement smooth transitions between transcript windows
  - _Requirements: 2.4.1_

- [x] 8. Wire up dual-context system in main application
  - Connect TTS session to chat-view component for texting flow
  - Connect STS session to call-transcript component for calling flow
  - Implement context switching logic that preserves both conversation histories
  - Pass appropriate `outputNode` to `live2d-visual` component from active session
  - _Requirements: 2.3.1, 2.5.1_

- [x] 9. Implement independent reset functionality
  - Add reset capability for texting context that only clears text transcript
  - Add reset capability for calling context that only clears call transcript
  - Ensure reset of one mode doesn't affect the other mode's conversation history
  - _Requirements: 2.6.1_

- [x] 10. Fix lazy session initialization to prevent startup API calls
  - Remove automatic `_initTextSession()` call from `initClient()` method
  - Ensure `_handleSendMessage` checks for null `textSession` and initializes it before sending first message
  - Verify that no sessions are created during app startup (both `textSession` and `callSession` should be null)
  - Test that TTS session is only created when user sends first message
  - Test that STS session is only created when user clicks call button
  - _Requirements: 2.1.1, 2.2.1_

- [x] 11. Refactor application to land directly on main UI instead of settings menu
  - Remove settings menu as landing page behavior from application initialization
  - Ensure main UI (chat interface) is displayed immediately when app loads
  - Update application startup flow to show chat-view by default
  - Verify settings menu is hidden by default on app startup
  - _Requirements: 2.7.1_

- [x] 12. Implement API key presence check with conditional settings menu display
  - Add `_checkApiKeyExists()` method to check if API key is present (not empty)
  - Add `_showApiKeyPrompt()` method to open settings menu and show toast
  - Add `_handleApiKeySaved()` method to close settings and toast when key is saved
  - Update `_handleSendMessage()` to check API key presence before TTS session initialization
  - Update `_handleCallStart()` to check API key presence before STS session initialization
  - _Requirements: 2.8.1_

- [x] 13. Create toast notification component for API key prompts
  - Implement `toast-notification` component with visibility control
  - Add support for different toast types (info, warning, error)
  - Implement `show()` and `hide()` methods for toast management
  - Add styling for toast notifications with appropriate positioning
  - _Requirements: 2.8.1_

- [x] 14. Update settings menu component for on-demand display
  - Modify settings menu to support conditional visibility based on API key validation
  - Add `api-key-saved` event emission when user saves valid API key
  - Implement `_handleSave()` method with API key validation
  - Add `_handleCancel()` method to close settings without saving
  - _Requirements: 2.8.1_

- [x] 14.1. Implement comprehensive API key validation in settings menu
  - Add `_validateApiKey()` method to check format (starts with "AIzaSy", 39 characters total)
  - Implement error state management with `_error` property for validation messages
  - Add visual confirmation for valid API keys and clear error messages on input
  - Implement `_onApiKeyInput()` method to update apiKey and clear errors
  - _Requirements: 2.10.1_

- [x] 14.2. Add clipboard support and external link functionality
  - Implement `_onPaste()` method using Clipboard API to populate input field
  - Add "Paste" button next to API key input field
  - Implement `_getApiKeyUrl()` method to open "https://aistudio.google.com/apikey" in new tab
  - Add "Get API Key" button or link in settings menu
  - _Requirements: 2.11.1_

- [x] 14.3. Implement API key persistence with localStorage
  - Add automatic saving to localStorage when API key is validated successfully
  - Implement loading of saved API key from localStorage on application startup
  - Ensure API key field is populated with saved value when settings menu opens
  - _Requirements: 2.11.1_

- [x] 15. Wire up API key validation flow in main application
  - Add state management for `showSettings`, `showToast`, and `toastMessage`
  - Connect settings menu `api-key-saved` event to `_handleApiKeySaved()` method
  - Implement toast display logic when API key is missing
  - Ensure original user action (send message/start call) proceeds after API key is saved
  - _Requirements: 2.8.1_

- [x] 15.1. Add manual settings menu access
  - Add settings button or icon to main interface for manual access
  - Implement `_toggleSettings()` method to show/hide settings menu manually
  - Ensure settings menu can be opened independently of API key validation flow
  - Add proper styling and positioning for settings button in main UI
  - _Requirements: 2.9.1_

- [x] 16. Fix call transcript layout to match chat transcript dimensions
  - Update main application CSS grid layout to support three-column approach (chat, model, call transcript)
  - Modify call-transcript component positioning to appear on the right side with 400px width
  - Ensure call transcript doesn't extend into Live2D model area for better readability
  - Update layout transitions to maintain consistent positioning between texting and calling modes
  - _Requirements: 2.12.1_

- [ ] 17. Update unit test suite for settings menu and API key presence check
  - Write unit tests for API key presence check logic
  - Write unit tests for settings menu conditional display
  - Write unit tests for toast notification behavior
  - Write unit tests for API key presence check flow in TTS and STS initialization
  - Update existing tests to account for new application startup behavior
  - _Requirements: 2.7.1, 2.8.1_

- [*] 17. Create unit test suite for dual-context system
  - Write unit tests for dual-context state management logic
  - Write unit tests for transcript window visibility controls
  - Write unit tests for TTS and STS session management
  - Write unit tests for context preservation across mode switches
  - Write unit tests for lazy session initialization behavior
  - _Requirements: All requirements_