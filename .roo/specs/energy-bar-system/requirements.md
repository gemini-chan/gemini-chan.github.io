# Feature: Energy Bar System

## 1. Introduction
This document outlines the requirements for the Energy Bar System. This feature will manage the AI's "energy" level, which corresponds to different backend AI models. As rate limits for more powerful models are exhausted, the system will gracefully degrade to less powerful models, communicating the change to the user through a visual energy bar icon and adjusted conversational prompts. This system will leverage the existing rate limit detection logic.

## 2. Epics

### 2.1. Epic: Tiered Model State Management
This epic covers the logic for tracking the current model tier and managing the fallback to lower tiers when the existing rate-limit detection indicates a failure.

#### 2.1.1. User Story: Track Current Energy Level
- **Priority**: High
- **As a** system,
- **I want** to maintain the current energy level state (e.g., 3, 2, 1, 0),
- **so that** other parts of the application can react to changes in the energy level.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Initialize at full energy
  Given the application starts
  When the Energy Bar System is initialized
  Then the energy level is set to 3 (full).
```

#### 2.1.2. User Story: Downgrade Energy Level on Rate Limit
- **Priority**: High
- **As a** system,
- **I want** to decrement the energy level when a rate limit error is detected,
- **so that** the application can switch to the next model tier.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Downgrade from full to medium
  Given the current energy level is 3
  And a rate limit error is detected
  When the system processes the error
  Then the energy level is set to 2.

Scenario: Downgrade from medium to low
  Given the current energy level is 2
  And a rate limit error is detected
  When the system processes the error
  Then the energy level is set to 1.

Scenario: Downgrade from low to exhausted
  Given the current energy level is 1
  And a rate limit error is detected
  When the system processes the error
  Then the energy level is set to 0.
```

#### 2.1.3. User Story: Reset Energy Level on New Session
- **Priority**: High
- **As a** system,
- **I want** to reset the energy level to the highest tier at the start of every new call session,
- **so that** each conversation starts with the best possible model, regardless of the previous session's state.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Start a new call after previous session was exhausted
  Given the energy level was 0 at the end of the last call
  When a new STS session is connected (a new call starts)
  Then the energy level is reset to 3.

Scenario: Start a new call while previous session was degraded
  Given the energy level was 1 at the end of the last call
  When a new STS session is connected (a new call starts)
  Then the energy level is reset to 3.
```

#### 2.1.4. User Story: Log Energy Level Changes
- **Priority**: Medium
- **As a** developer,
- **I want** every change in the energy level to be logged using the standard debug logging system,
- **so that** I can easily trace the model switching behavior during development and troubleshooting.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Log a downgrade event
  Given the debug logger is enabled for the 'energy-bar-system' component
  And the energy level is 3
  When a rate limit error causes a downgrade
  Then a debug log is emitted with the message "Energy level downgraded"
  And the log data includes the old level (3), the new level (2), and the reason ("rate-limit-exceeded").

Scenario: Log a session reset event
  Given the debug logger is enabled for the 'energy-bar-system' component
  And the energy level is 0
  When a new session starts
  Then a debug log is emitted with the message "Energy level reset"
  And the log data includes the new level (3) and the reason ("session-reset").

Scenario: Do not log when disabled
  Given the debug logger is disabled for the 'energy-bar-system' component
  When the energy level changes for any reason
  Then no log related to the energy level is emitted.
```

### 2.2. Epic: Energy Bar UI
This epic covers the implementation of the battery-style UI component that visually represents the current energy level to the user.

#### 2.2.1. User Story: Display Energy Bar Icon
- **Priority**: High
- **As a** user,
- **I want** to see a battery-style icon in the call transcript view,
- **so that** I am aware of the current energy level of the AI.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Display the energy bar
  Given I am in the call transcript view
  When the application loads
  Then the energy bar icon is visible.
```

#### 2.2.2. User Story: Update Icon Based on Energy Level
- **Priority**: High
- **As a** user,
- **I want** the energy bar icon to visually change as the energy level changes,
- **so that** I can instantly understand the current state of the AI's capabilities.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Full energy
  Given the energy level is 3
  When the UI updates
  Then the battery icon shows 3 out of 3 bars filled
  And the icon color is green.

Scenario: Medium energy
  Given the energy level is 2
  When the UI updates
  Then the battery icon shows 2 out of 3 bars filled
  And the icon color is yellow.

Scenario: Low energy
  Given the energy level is 1
  When the UI updates
  Then the battery icon shows 1 out of 3 bars filled
  And the icon color is orange.

Scenario: Exhausted energy
  Given the energy level is 0
  When the UI updates
  Then the battery icon shows 0 out of 3 bars filled (empty)
  And the icon color is red.
```

#### 2.2.3. User Story: Animate Energy Bar on State Change
- **Priority**: Medium
- **As a** user,
- **I want** the energy bar to have a subtle animation when its state changes,
- **so that** the transition is visually engaging and draws my attention to the change.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Energy level decreases
  Given the energy level is 3
  When the energy level drops to 2
  Then the third bar of the battery icon animates out (e.g., fades or drains).

Scenario: Energy level resets on new connection
  Given the energy level is 1
  When a new session starts and the level resets to 3
  Then the battery icon animates to fill up to 3 bars
  And the icon flashes briefly to indicate a successful connection.
```

### 2.3. Epic: Persona-Based Conversational Prompts
This epic covers the different conversational prompts Gemini-chan will use at each energy level. The prompts must also be tailored to the currently active persona (e.g., VTuber, Assistant, or Generic).

#### 2.3.1. User Story: Persona-Specific Prompts for Degraded Energy Levels
- **Priority**: High
- **As a** user,
- **I want** Gemini-chan's conversational prompts to change based on her energy level and selected persona,
- **so that** the experience feels immersive and I understand the reason for any change in conversational depth.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Medium energy prompt for VTuber persona
  Given the current energy level is 2
  And the selected persona is 'VTuber'
  When the system needs to display a prompt
  Then a message like "I'm feeling a little tired, so I might not be able to have super deep conversations right now, but I'll try my best!" is used.

Scenario: Low energy prompt for Assistant persona
  Given the current energy level is 1
  And the selected persona is 'Assistant'
  When the system needs to display a prompt
  Then a message like "My processing power is limited at the moment. I can still assist with basic tasks." is used.

Scenario: Exhausted energy prompt for Generic persona
  Given the current energy level is 0
  And the selected persona is 'Generic'
  When the system needs to display a prompt
  Then a message like "I'm sorry, I'm out of energy and need to rest. Please try again later." is used.
```

#### 2.3.2. User Story: No Special Prompt for Full Energy
- **Priority**: High
- **As a** user,
- **I want** the conversation to proceed normally when the energy level is full,
- **so that** the experience is seamless and uninterrupted when the AI is at full capacity.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Full energy conversation
  Given the energy level is 3
  And any persona is selected
  When the user interacts with the system
  Then no special energy-related prompt is displayed, and the conversation proceeds as normal.
```