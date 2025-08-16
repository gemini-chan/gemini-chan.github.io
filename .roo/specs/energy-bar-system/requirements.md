# Feature: Energy Bar System (Dual-Session Indicators)

## 1. Introduction
This document outlines the requirements for the Energy Bar System, which is designed to work in concert with the **Dual-Input Mode** feature (see `../dual-input-mode/requirements.md`). This system manages the AI's "energy" level by maintaining separate energy pools for the **STS (voice call)** and **TTS (text chat)** sessions, with dedicated indicators for each mode.

As rate limits for more powerful models are exhausted in a specific session, the system will gracefully degrade to a less powerful model for that session only, communicating the change to the user through dedicated session-specific energy indicators and immersive conversational prompts.

## 2. Epics

### 2.1. Epic: Tiered Model State Management (Dual-Mode)
This epic covers the logic for tracking the current model tier for both STS and TTS modes and managing the fallback to lower tiers when rate-limit failures occur in either mode. The TTS mode uses a simplified 3-level system (2, 1, 0) to avoid redundant model switches, while STS maintains the full 4-level system (3, 2, 1, 0).

#### 2.1.1. User Story: Track Independent Energy Levels with Mode-Specific Ranges
- **Priority**: High
- **As a** system,
- **I want** to maintain separate energy level states for STS (3, 2, 1, 0) and TTS (2, 1, 0) modes,
- **so that** energy depletion in one mode does not affect the other and TTS avoids unnecessary model reconnections.

##### Acceptance Criteria
```gherkin
Scenario: Initialize at full energy for both modes
  Given the application starts
  When the Energy Bar System is initialized
  Then the energy level for STS is set to 3
  And the energy level for TTS is set to 2.

Scenario: TTS energy levels are constrained to 2, 1, 0
  Given the TTS mode is active
  When energy levels are managed
  Then the TTS energy level can only be 2, 1, or 0
  And the TTS energy level never reaches 3.
```

#### 2.1.2. User Story: Downgrade Energy Level on Mode-Specific Rate Limit
- **Priority**: High
- **As a** system,
- **I want** to decrement the energy level for the specific mode (STS or TTS) where a rate limit error is detected,
- **so that** the application can switch to the next model tier for that mode only.

##### Acceptance Criteria
```gherkin
Scenario: Downgrade STS energy on call rate limit
  Given the current STS energy level is 3
  And the TTS energy level is 2
  And a rate limit error is detected during an STS call
  When the system processes the error
  Then the STS energy level is set to 2
  And the TTS energy level remains 2.

Scenario: Downgrade TTS energy on chat rate limit
  Given the current STS energy level is 3
  And the TTS energy level is 2
  And a rate limit error is detected during a TTS chat session
  When the system processes the error
  Then the TTS energy level is set to 1
  And the STS energy level remains 3.

Scenario: TTS fallback model at energy level 1
  Given the TTS energy level is 1
  When the system needs to select a model for TTS
  Then the system uses "gemini-2.0-flash-live-001" as the fallback model
  And this provides stable TTS functionality at reduced capability.
```

#### 2.1.3. User Story: Reset STS Energy Level on New Call Session
- **Priority**: High
- **As a** system,
- **I want** to reset the **STS energy level** to the highest tier at the start of every new call session,
- **so that** each call starts with the best possible model, without affecting the TTS energy state.

##### Acceptance Criteria
```gherkin
Scenario: Start a new call after previous session was exhausted
  Given the STS energy level was 0 at the end of the last call
  And the TTS energy level is 1
  When a new STS session is connected (a new call starts)
  Then the STS energy level is reset to 3
  And the TTS energy level remains 1.
```

#### 2.1.4. User Story: Log Mode-Specific Energy Level Changes
- **Priority**: Medium
- **As a** developer,
- **I want** every change in energy level to be logged with its corresponding mode (STS or TTS),
- **so that** I can easily trace model switching behavior.

##### Acceptance Criteria
```gherkin
Scenario: Log an STS downgrade event
  Given the debug logger is enabled for the 'energy-bar-system' component
  And the STS energy level is 3
  When a rate limit error on an STS call causes a downgrade
  Then a debug log is emitted with the message "Energy level downgraded"
  And the log data includes the mode ('sts'), old level (3), new level (2), and reason ("rate-limit-exceeded").
```

### 2.2. Epic: Dual-Session Energy Indicators
This epic covers the UI components that visually represent energy levels for both STS and TTS sessions, displayed contextually within their respective interfaces.

#### 2.2.1. User Story: Display STS Energy Indicator in Call Interface ✅ IMPLEMENTED
- **Priority**: High
- **As a** user,
- **I want** to see a battery-style energy indicator within the call interface when I'm on a call,
- **so that** I am aware of the current energy level of the AI during the voice conversation.

##### Acceptance Criteria
```gherkin
Scenario: Display STS energy indicator during call
  Given I am in an active call
  When the call interface is displayed
  Then an STS energy indicator is visible in the call header area
  And the indicator reflects the current STS energy level.

Scenario: Hide STS energy indicator when not calling
  Given I am not in an active call
  When the main interface is displayed
  Then no STS energy indicator is visible anywhere in the UI.
```

#### 2.2.2. User Story: Display TTS Energy Indicator in Chat Interface
- **Priority**: High
- **As a** user,
- **I want** to see a battery-style energy indicator within the chat interface when I'm texting,
- **so that** I am aware of the current energy level of the AI during text conversations.

##### Acceptance Criteria
```gherkin
Scenario: Display TTS energy indicator in chat header
  Given I am viewing the chat interface
  When the chat window is displayed
  Then a TTS energy indicator is visible in the chat header area
  And the indicator reflects the current TTS energy level.

Scenario: TTS energy indicator shows 2-level system
  Given the TTS energy indicator is visible
  When the TTS energy level is 2
  Then the indicator shows 2 out of 2 bars filled and is green.

Scenario: TTS energy indicator shows degraded state
  Given the TTS energy indicator is visible
  When the TTS energy level is 1
  Then the indicator shows 1 out of 2 bars filled and is yellow.

Scenario: TTS energy indicator shows exhausted state
  Given the TTS energy indicator is visible
  When the TTS energy level is 0
  Then the indicator shows 0 out of 2 bars filled and is red.
```

#### 2.2.3. User Story: Independent Energy Indicator Updates
- **Priority**: High
- **As a** user,
- **I want** each energy indicator to update independently based on its respective session,
- **so that** I can clearly understand the energy state of each interaction mode separately.

##### Acceptance Criteria
```gherkin
Scenario: STS energy change does not affect TTS indicator
  Given both STS and TTS energy indicators are visible
  And the STS energy level is 3
  And the TTS energy level is 2
  When the STS energy level drops to 2
  Then the STS indicator updates to show 2 bars
  And the TTS indicator remains unchanged showing 2 bars.

Scenario: TTS energy change does not affect STS indicator
  Given both STS and TTS energy indicators are visible
  And the STS energy level is 3
  And the TTS energy level is 2
  When the TTS energy level drops to 1
  Then the TTS indicator updates to show 1 bar
  And the STS indicator remains unchanged showing 3 bars.
```

### 2.3. Epic: Persona-Based Conversational Prompts (Mode-Aware)
This epic covers the different conversational prompts Gemini-chan will use at each energy level, tailored to the active persona and the specific interaction mode (STS or TTS).

#### 2.3.1. User Story: Persona-Specific Prompts for Degraded STS Energy
- **Priority**: High
- **As a** user,
- **I want** Gemini-chan's conversational prompts during a call to change based on her STS energy level,
- **so that** the experience feels immersive and I understand the reason for any change in conversational depth.

##### Acceptance Criteria
```gherkin
Scenario: Medium STS energy prompt for VTuber persona
  Given the STS energy level is 2
  And the selected persona is 'VTuber'
  When the system needs to display a prompt during a call
  Then a message like "I might be running a tiny bit low on brainpower—so if I trail off or keep things simpler, forgive me!" is used.

Scenario: Low STS energy prompt for Assistant persona
  Given the STS energy level is 1
  And the selected persona is 'Assistant'
  When the system needs to display a prompt during a call
  Then a message like "My emotional scanner’s flickering... I can still hear you just fine and respond, but my feeling for the conversation’s tone might be a bit off." is used.

Scenario: Exhausted STS energy prompt (sleepy mode)
  Given the STS energy level is 0
  And any persona is selected
  When a user tries to start a call
  Then an immersive, persona-specific "sleepy" prompt is displayed indicating zero consciousness.
```

#### 2.3.2. User Story: Persona-Specific Chat Greetings and TTS Energy Prompts
- **Priority**: High
- **As a** user,
- **I want** Gemini-chan to greet me with a persona-specific message when I start chatting at full TTS energy,
- **so that** I feel welcomed and encouraged to start a conversation.

##### Acceptance Criteria
```gherkin
Scenario: VTuber greeting at TTS energy level 2
  Given the TTS energy level is 2
  And the selected persona is 'VTuber'
  When the chat window is displayed
  Then a greeting like "Hey there! ✨ I'm Gemini-chan, and I'm super excited to chat with you!" is injected into the chat.

Scenario: Assistant greeting at TTS energy level 2
  Given the TTS energy level is 2
  And the selected persona is 'Assistant'
  When the chat window is displayed
  Then a greeting like "Hello! I'm Gemini-san, your professional assistant. I'm ready to help you with any questions or tasks you might have." is injected into the chat.

Scenario: TTS degraded energy prompts injected into chat
  Given the TTS energy level is 1 or 0
  And any persona is selected
  When the energy level changes
  Then a persona-specific degraded energy message is injected directly into the chat window as a model message.