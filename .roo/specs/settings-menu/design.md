# Settings Menu Design

## 1. Overview

This document provides the technical design for the settings menu feature. The goal is to create a new settings component that allows users to enter and save their API key. The component will be built using Lit, and it will be consistent with the existing application's UI and architecture.

## 2. Architecture

The settings menu will be implemented as a new Lit component named `settings-menu`. This component will be conditionally rendered by the main `gdm-live-audio` component. A new button will be added to the main controls to toggle the visibility of the settings menu.

The API key will be stored in the browser's `localStorage` to persist between sessions. The `gdm-live-audio` component will be responsible for reading the key from `localStorage` on startup and passing it to the `GoogleGenAI` client.

## 3. Components and Interfaces

### 3.1. `settings-menu` Component

A new file, `settings-menu.ts`, will be created with the following structure:

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('settings-menu')
export class SettingsMenu extends LitElement {
  @property({ type: String })
  apiKey = '';

  @state()
  private _error = '';

  @state()
  private _isSaving = false;

  static styles = css`
    :host {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    :host([active]) {
      opacity: 1;
    }
    .container {
      background: #222;
      padding: 2em;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 1em;
      width: 400px;
    }
    input {
      background: #333;
      border: 1px solid #555;
      color: white;
      padding: 0.5em;
      border-radius: 6px;
    }
    .buttons {
      display: flex;
      gap: 1em;
      justify-content: flex-end;
    }
    button {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        padding: 0.5em 1em;
        cursor: pointer;
    }
    button {
        /* ... existing styles ... */
        transition: background-color 0.2s ease-in-out;
    }
    button:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    .error {
      color: #ff8a80;
      font-size: 0.9em;
    }
  `;

  render() {
    return html`
      <!-- Component template will go here -->
    `;
  }

  private _onApiKeyInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.apiKey = input.value;
    this._error = ''; // Clear error on input
  }

  private async _onPaste() {
    try {
      const text = await navigator.clipboard.readText();
      this.apiKey = text;
    } catch (err) {
      this._error = 'Failed to paste from clipboard.';
      console.error('Failed to read clipboard contents: ', err);
    }
  }

  firstUpdated() {
    this.shadowRoot.host.setAttribute('active', 'true');
  }

  private _onSave() {
    if (this._validateApiKey(this.apiKey)) {
      localStorage.setItem('gemini-api-key', this.apiKey);
      this.dispatchEvent(new CustomEvent('api-key-saved'));
    }
  }

  private _validateApiKey(key: string): boolean {
    if (!key) {
      this._error = 'API key cannot be empty.';
      return false;
    }
    // Basic format validation
    if (!key.startsWith('AIzaSy') || key.length !== 39) {
      this._error = 'Invalid API key format.';
      return false;
    }
    return true;
  }

  private _getApiKeyUrl() {
    window.open('https://aistudio.google.com/apikey', '_blank');
  }
}
```

### 3.2. `gdm-live-audio` Component Modifications

The existing `gdm-live-audio` component in `index.tsx` will be modified to integrate the new settings menu.

**State:**

*   `@state() showSettings = false;`: A new state property to control the visibility of the settings menu.

**Methods:**

*   `private _toggleSettings()`: A new method to toggle the `showSettings` state.
*   `private _onApiKeySaved(e: CustomEvent)`: An event handler to listen for the `api-key-saved` event from the `settings-menu` component and re-initialize the `GoogleGenAI` client with the new key.

**UI Changes:**

*   A new "Settings" button will be added to the controls section.
*   The `settings-menu` component will be conditionally rendered based on the `showSettings` state.

## 4. Data Models

The only data being managed is the API key. It will be stored in `localStorage` under the key `gemini-api-key`.

*   **`localStorage.setItem('gemini-api-key', apiKey)`**
*   **`localStorage.getItem('gemini-api-key')`**

## 5. Error Handling

*   The `settings-menu` component will display validation errors for the API key input field.
*   Error messages will be cleared when the user starts typing in the input field.
*   The component will handle potential errors from the Clipboard API (e.g., if permissions are denied).

## 6. Testing Strategy

*   **Component Tests:**
    *   Verify that the settings menu opens and closes correctly.
    *   Test the API key validation logic with valid and invalid keys.
    *   Test the paste functionality.
    *   Verify that the API key is correctly saved to `localStorage`.
*   **Integration Tests:**
    *   Test the interaction between `gdm-live-audio` and `settings-menu`.
    *   Verify that the `GoogleGenAI` client is re-initialized with the new API key after it's saved.

## 7. Visual Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant User
    participant GdmLiveAudio
    participant SettingsMenu
    participant LocalStorage

    User->>GdmLiveAudio: Clicks settings button
    GdmLiveAudio->>GdmLiveAudio: Toggles showSettings
    GdmLiveAudio->>SettingsMenu: Renders settings menu

    User->>SettingsMenu: Enters API Key
    User->>SettingsMenu: Clicks Save
    SettingsMenu->>SettingsMenu: Validates API Key
    alt API Key is valid
        SettingsMenu->>LocalStorage: Saves API Key
        SettingsMenu->>GdmLiveAudio: Dispatches 'api-key-saved' event
        GdmLiveAudio->>GdmLiveAudio: Re-initializes GoogleGenAI client
    else API Key is invalid
        SettingsMenu->>SettingsMenu: Shows error message
    end