# Settings Menu

This document outlines the requirements for the new settings menu. The menu will provide users with a way to configure the application, starting with the ability to add and manage their API key. The design should be consistent with the existing user interface.

## 1. View Settings Menu

*   **As a** user,
    **I want** to access a settings menu,
    **so that** I can configure the application to my preferences.

*   **Acceptance Criteria:**
    1.  **While** the user is on the main screen, **the system shall** display a settings icon or button.
    2.  **When** the user clicks the settings icon or button, **the system shall** display the settings menu.
    3.  **The system shall** ensure the settings menu UI is consistent with the existing application style.

## 2. Enter API Key

*   **As a** user,
    **I want** to enter my API key in the settings menu,
    **so that** I can authenticate with the service.

*   **Acceptance Criteria:**
    1.  **While** the settings menu is open, **the system shall** display an input field labeled "API Key".
    2.  **When** the user types in the API key input field, **the system shall** update the field's value.

## 3. Validate API Key

*   **As a** user,
    **I want** the application to validate my API key,
    **so that** I know I have entered it correctly.

*   **Acceptance Criteria:**
    1.  **When** the user has finished entering the API key, **the system shall** validate the key's format.
    2.  A valid API key format is a string that starts with "AIzaSy" and is followed by 33 alphanumeric characters.
    3.  **If** the API key is valid, **the system shall** provide a visual confirmation (e.g., a checkmark).
    4.  **If** the API key is empty, **the system shall** display an error message "API key cannot be empty."
    5.  **If** the API key does not match the required format, **the system shall** display an error message "Invalid API key format."
    6.  **The system shall** clear the error message as soon as the user starts correcting the input.

## 4. Save API Key

*   **As a** user,
    **I want** the application to save my API key automatically,
    **so that** I don't have to enter it every time I use the app.

*   **Acceptance Criteria:**
    1.  **When** the API key has been successfully validated, **the system shall** automatically save the key to the browser's local storage.
    2.  **When** the user re-opens the application, **the system shall** load the saved API key from local storage and populate the API key field.

## 5. Paste API Key

*   **As a** user,
    **I want** to be able to paste my API key from the clipboard,
    **so that** I can enter it quickly and accurately.

*   **Acceptance Criteria:**
    1.  **While** in the settings menu, **the system shall** display a "Paste" button next to the API key input field.
    2.  **When** the user clicks the "Paste" button, **the system shall** read the text content from the clipboard using the Clipboard API.
    3.  **The system shall** then populate the API key input field with the content from the clipboard.

## 6. Get API Key

*   **As a** user,
    **I want** a link to get an API key,
    **so that** I can easily find where to generate one if I don't have it.

*   **Acceptance Criteria:**
    1.  **While** in the settings menu, **the system shall** display a "Get API Key" button or link.
    2.  **When** the user clicks the "Get API Key" button or link, **the system shall** open the URL "https://aistudio.google.com/apikey" in a new browser tab.