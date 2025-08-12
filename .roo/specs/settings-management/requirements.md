# Feature: Settings and API Key Management

## 1. Introduction
This document outlines the requirements for the application's settings management, focusing on API key configuration. The goal is to provide a seamless user experience where users are guided to configure their API key when necessary, can manage it through a dedicated settings menu, and have their key persist across sessions.

## 2. Requirements

### 2.1. Direct Main UI Landing with API Key Validation
- **As a** user,
- **I want** the application to land directly on the main UI instead of the settings menu,
- **so that** I can immediately see the chat interface and start interacting.

#### 2.1.1. Acceptance Criteria
- **WHEN** the application loads **THEN** the main UI (chat interface) is displayed immediately instead of the settings menu
- **WHEN** the application loads **THEN** the settings menu is hidden by default
- **WHEN** the application loads and API key is configured **THEN** the user can immediately start texting or calling
- **WHEN** the application loads and API key is not configured **THEN** the main UI is still shown but interactions are blocked

### 2.2. API Key Management with Settings Menu and Toast
- **As a** user,
- **I want** to be prompted to enter my API key when I try to use features that require it,
- **so that** I understand what's needed to start using the application.

#### 2.2.1. Acceptance Criteria
- **WHEN** I try to send my first text message and API key is empty **THEN** the settings menu opens automatically and a toast message prompts me to enter the API key
- **WHEN** I try to start a call and API key is empty **THEN** the settings menu opens automatically and a toast message prompts me to enter the API key
- **WHEN** the settings menu opens due to missing API key **THEN** a toast message displays "Please enter your Gemini API key to start chatting"
- **WHEN** I enter a valid API key in the settings menu **THEN** the settings menu closes automatically and I can proceed with my intended action
- **WHEN** I enter a valid API key and close the settings menu **THEN** the toast message disappears
- **WHEN** API key is already configured **THEN** no settings menu or toast appears during normal usage

### 2.3. Settings Menu Access
- **As a** user,
- **I want** to access a settings menu manually,
- **so that** I can configure the application to my preferences at any time.

#### 2.3.1. Acceptance Criteria
- **WHEN** the application is running **THEN** a settings icon or button is visible in the main interface
- **WHEN** I click the settings icon or button **THEN** the settings menu opens
- **WHEN** the settings menu is open **THEN** the UI is consistent with the existing application style
- **WHEN** a call is active **THEN** the settings icon/button is hidden and the settings menu cannot be opened

### 2.4. API Key Input and Validation
- **As a** user,
- **I want** to enter and validate my API key in the settings menu,
- **so that** I can authenticate with the service correctly.

#### 2.4.1. Acceptance Criteria
- **WHEN** the settings menu is open **THEN** an input field labeled "API Key" is displayed
- **WHEN** I type in the API key input field **THEN** the field's value updates
- **WHEN** I finish entering the API key **THEN** the system validates the key's format
- **WHEN** the API key is valid (starts with "AIzaSy" and is 39 characters total) **THEN** a visual confirmation appears
- **WHEN** the API key is empty **THEN** an error message "API key cannot be empty" is displayed
- **WHEN** the API key format is invalid **THEN** an error message "Invalid API key format" is displayed
- **WHEN** I start correcting invalid input **THEN** the error message clears immediately

### 2.5. API Key Persistence and Clipboard Support
- **As a** user,
- **I want** the application to save my API key and support clipboard pasting,
- **so that** I don't have to re-enter it every time and can input it quickly.

#### 2.5.1. Acceptance Criteria
- **WHEN** the API key is successfully validated **THEN** the system automatically saves it to browser's local storage
- **WHEN** I reopen the application **THEN** the saved API key is loaded from local storage and populates the field
- **WHEN** the settings menu is open **THEN** a "Paste" button is displayed next to the API key input field
- **WHEN** I click the "Paste" button **THEN** the system reads text from clipboard and populates the input field
- **WHEN** the settings menu is open **THEN** a "Get API Key" button or link is displayed
- **WHEN** I click the "Get API Key" button **THEN** the URL "https://aistudio.google.com/apikey" opens in a new browser tab

### 2.6. Dynamic API Key Management
- **As a** user,
- **I want** the application to immediately apply API key changes without requiring a page refresh,
- **so that** I can test different API keys or update my key seamlessly during runtime.

#### 2.6.1. Acceptance Criteria
- **WHEN** I enter a valid API key in the settings menu **THEN** the system immediately reinitializes the AI client with the new key
- **WHEN** the API key is successfully changed **THEN** a toast notification displays "API key updated successfully! ✨"
- **WHEN** the API key change fails validation **THEN** a toast notification displays the specific error message
- **WHEN** the API key is updated **THEN** the main application receives an event notification about the change
- **WHEN** I enter the same API key that's already saved **THEN** no unnecessary reinitialization occurs and no toast is shown
- **WHEN** I clear the API key field **THEN** a validation error appears and the existing API key remains in local storage

### 2.7. Real-time API Key Validation
- **As a** user,
- **I want** immediate feedback when typing my API key,
- **so that** I know if my key is valid before trying to use it.

#### 2.7.1. Acceptance Criteria
- **WHEN** I type in the API key field **THEN** validation occurs automatically after a brief delay (500ms)
- **WHEN** the API key format is valid during typing **THEN** a green checkmark appears immediately
- **WHEN** the API key format is invalid during typing **THEN** a red X appears with the error message
- **WHEN** I start typing a new API key **THEN** previous validation indicators are cleared immediately
- **WHEN** the API key field loses focus **THEN** final validation and auto-save occurs if the key is valid
- **WHEN** I paste an API key **THEN** validation and auto-save occurs immediately after pasting