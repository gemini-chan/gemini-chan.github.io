# Feature: Energy Bar System (Dual-Mode)

## 1. Introduction
This document outlines the requirements for the Energy Bar System, which is designed to work in concert with the **Dual-Input Mode** feature (see `../dual-input-mode/requirements.md`). This system manages the AI's "energy" level by maintaining separate energy pools for the **STS (voice call)** and **TTS (text chat)** modes.

As rate limits for more powerful models are exhausted in a specific mode, the system will gracefully degrade to a less powerful model for that mode only, communicating the change to the user through a visual energy bar icon (for STS) and adjusted conversational prompts.

## 2. Epics

### 2.1. Epic: Tiered Model State Management (Dual-Mode)
This epic covers the logic for tracking the current model tier for both STS and TTS modes and managing the fallback to lower tiers when rate-limit failures occur in either mode.

#### 2.1.1. User Story: Track Independent Energy Levels
- **Priority**: High
- **As a** system,
- **I want** to maintain separate energy level states (e.g., 3, 2, 1, 0) for the STS and TTS modes,
- **so that** energy depletion in one mode does not affect the other.

##### Acceptance Criteria
```gherkin
Scenario: Initialize at full energy for both modes
  Given the application starts
  When the Energy Bar System is initialized
  Then the energy level for STS is set to 3
  And the energy level for TTS is set to 3.
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
  And the TTS energy level is 3
  And a rate limit error is detected during an STS call
  When the system processes the error
  Then the STS energy level is set to 2
  And the TTS energy level remains 3.

Scenario: Downgrade TTS energy on chat rate limit
  Given the current STS energy level is 3
  And the TTS energy level is 2
  And a rate limit error is detected during a TTS chat session
  When the system processes the error
  Then the TTS energy level is set to 1
  And the STS energy level remains 3.
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

### 2.2. Epic: Energy Bar UI (STS Focus)
This epic covers the UI component that visually represents the **STS energy level only**.

#### 2.2.1. User Story: Display STS Energy Bar Icon
- **Priority**: High
- **As a** user,
- **I want** to see a battery-style icon in a status bar at the top-right of the main UI,
- **so that** I am aware of the current energy level of the AI for the call.

##### Acceptance Criteria
```gherkin
Scenario: Display the energy bar for STS
  Given I am in the main UI
  When the application loads
  Then the energy bar icon is visible in the top-right status bar and reflects the STS energy level.

Scenario: Hide energy bar during active call
  Given the energy bar is visible in the status bar
  When a call becomes active
  Then the energy bar in the status bar is hidden.
```

#### 2.2.2. User Story: Update Icon Based on STS Energy Level
- **Priority**: High
- **As a** user,
- **I want** the energy bar icon to visually change as the STS energy level changes,
- **so that** I can instantly understand the current state of the AI's calling capabilities.

##### Acceptance Criteria
```gherkin
Scenario: Full STS energy
  Given the STS energy level is 3
  When the UI updates
  Then the battery icon shows 3 out of 3 bars filled and is green.

Scenario: Exhausted STS energy
  Given the STS energy level is 0
  When the UI updates
  Then the battery icon shows 0 out of 3 bars filled and is red.

Scenario: TTS energy change does not affect the UI
  Given the STS energy level is 3
  And the TTS energy level is 2
  When the TTS energy level drops to 1
  Then the battery icon remains unchanged (showing 3 bars).
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