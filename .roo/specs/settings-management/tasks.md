# Implementation Plan: Settings and API Key Management

## 🎯 **Current Priority**
Implement the settings menu and API key management functionality.

- [x] 1. Implement Settings Menu UI: Create the `settings-menu.ts` component with an API key input field, validation, and paste/get key buttons.
  - Requirements: 2.3.1, 2.4.1, 2.5.1

- [x] 2. Implement API Key Validation and Persistence: Add logic to validate the API key format and save it to local storage upon successful validation.
  - Requirements: 2.4.1, 2.5.1

- [x] 3. Implement On-Demand Settings and Toast: In the main application, trigger the settings menu and a toast notification when an action requires a missing API key.
  - Requirements: 2.2.1

- [x] 4. Testing: Write unit and integration tests for all new functionality.
  - Sub-tasks:
    - [x] 4.1. Test API key validation and persistence.
    - [x] 4.2. Test the on-demand settings menu and toast notifications.
    - [x] 4.3. Test that the settings menu is hidden during active calls.

- [ ] 5. DEFERRED: Add dedicated tests for API key validation and on-demand settings/toast functionality.