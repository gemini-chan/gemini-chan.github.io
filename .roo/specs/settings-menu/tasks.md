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

### 4. Testing

- [ ] **4.1. Write component tests for `settings-menu`.**
- [ ] **4.2. Write integration tests.**