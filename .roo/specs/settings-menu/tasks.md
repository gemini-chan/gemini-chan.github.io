# Settings Menu Implementation Plan

This document breaks down the implementation of the settings menu feature into a series of actionable tasks. Each task is designed to be a concrete coding step that can be executed by a developer.

### 1. Create the Settings Menu Component

- [x] **1.1. Create the `settings-menu.ts` file.**
  - This file will contain the new Lit component for the settings menu.
  - **File to create:** [`settings-menu.ts`](settings-menu.ts)
  - **References:** `design.md` section 3.1

- [x] **1.2. Implement the basic structure of the `settings-menu` component.**
  - Define the component's properties (`apiKey`, `_error`, `_isSaving`).
  - Add the styles defined in the design document.
  - **File to modify:** [`settings-menu.ts`](settings-menu.ts)
  - **References:** `design.md` section 3.1

- [x] **1.3. Implement the `render` method for the settings menu.**
  - Create the HTML structure for the settings menu, including the input field, buttons, and error message area.
  - **File to modify:** [`settings-menu.ts`](settings-menu.ts)
  - **References:** `design.md` section 3.1, `requirements.md` sections 2.1, 5.1, 6.1

### 2. Implement API Key Functionality

- [x] **2.1. Implement the API key input handling.**
  - Implement the `_onApiKeyInput` method to update the `apiKey` property and clear any validation errors.
  - **File to modify:** [`settings-menu.ts`](settings-menu.ts)
  - **References:** `design.md` section 3.1, `requirements.md` section 2.2

- [x] **2.2. Implement API key validation.**
  - Implement the `_validateApiKey` method to check for an empty key and validate the format.
  - **File to modify:** [`settings-menu.ts`](settings-menu.ts)
  - **References:** `design.md` section 3.1, `requirements.md` sections 3.2, 3.4, 3.5

- [x] **2.3. Implement the "Paste" button functionality.**
  - Implement the `_onPaste` method to read from the clipboard and populate the input field.
  - **File to modify:** [`settings-menu.ts`](settings-menu.ts)
  - **References:** `design.md` section 3.1, `requirements.md` sections 5.2, 5.3

- [x] **2.4. Implement the "Save" button functionality.**
  - Implement the `_onSave` method to validate the key, save it to `localStorage`, and dispatch the `api-key-saved` event.
  - **File to modify:** [`settings-menu.ts`](settings-menu.ts)
  - **References:** `design.md` section 3.1, `requirements.md` section 4.1

- [x] **2.5. Implement the "Get API Key" button functionality.**
  - Implement the `_getApiKeyUrl` method to open the specified URL in a new tab.
  - **File to modify:** [`settings-menu.ts`](settings-menu.ts)
  - **References:** `design.md` section 3.1, `requirements.md` section 6.2

### 3. Integrate with the Main Application

- [x] **3.1. Add a "Settings" button to the `gdm-live-audio` component.**
  - Modify the `render` method in `index.tsx` to include a new button that toggles the settings menu.
  - **File to modify:** [`index.tsx`](index.tsx)
  - **References:** `design.md` section 3.2, `requirements.md` section 1.1

- [x] **3.2. Implement the logic to show and hide the settings menu.**
  - Add the `showSettings` state property and the `_toggleSettings` method to `gdm-live-audio`.
  - Conditionally render the `<settings-menu>` component based on the `showSettings` state.
  - **File to modify:** [`index.tsx`](index.tsx)
  - **References:** `design.md` section 3.2, `requirements.md` section 1.2

- [x] **3.3. Handle the `api-key-saved` event.**
  - Implement the `_onApiKeySaved` event handler in `gdm-live-audio` to re-initialize the `GoogleGenAI` client with the new key.
  - **File to modify:** [`index.tsx`](index.tsx)
  - **References:** `design.md` section 3.2, `requirements.md` section 4.1

- [x] **3.4. Load the API key on startup.**
  - Modify the `initClient` method in `gdm-live-audio` to read the API key from `localStorage` when the application loads.
  - **File to modify:** [`index.tsx`](index.tsx)
  - **References:** `design.md` section 2, `requirements.md` section 4.2

### 4. Testing (Skipped due to environment issues)

- [ ] **4.1. Set up the testing environment for Lit components.**
  - Ensure that the necessary testing libraries (e.g., `@web/test-runner`) are configured in the project.
  - **Files to modify:** `package.json`, `web-test-runner.config.js` (if it exists)
  - **References:** `design.md` section 6

- [ ] **4.2. Write component tests for `settings-menu`.**
  - **File to create:** `settings-menu.test.ts`
  - **References:** `design.md` section 6
  - **Test Cases:**
    - [ ] **4.2.1.** It should render the API key input field and all buttons correctly.
    - [ ] **4.2.2.** It should display an error message if the "Save" button is clicked with an empty API key.
    - [ ] **4.2.3.** It should display an error message if the API key has an invalid format.
    - [ ] **4.2.4.** It should clear the error message when the user starts typing in the input field.
    - [ ] **4.2.5.** It should correctly save a valid API key to `localStorage` and dispatch the `api-key-saved` event.
    - [ ] **4.2.6.** It should correctly paste text from the clipboard into the input field (mocking the Clipboard API).
    - [ ] **4.2.7.** It should call `window.open` with the correct URL when the "Get API Key" button is clicked.

- [ ] **4.3. Write integration tests.**
  - **File to modify:** `index.test.ts` (or create a new integration test file `settings-integration.test.ts`)
  - **References:** `design.md` section 6
  - **Test Cases:**
    - [ ] **4.3.1.** The `gdm-live-audio` component should render the "Settings" button.
    - [ ] **4.3.2.** Clicking the "Settings" button should show the `settings-menu` component.
    - [ ] **4.3.3.** The `gdm-live-audio` component should re-initialize the `GoogleGenAI` client when it receives the `api-key-saved` event.
    - [ ] **4.3.4.** The application should load the API key from `localStorage` on initial load and pass it to the `GoogleGenAI` client.