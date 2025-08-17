# Implementation Plan: Energy Bar System (Dual-Mode)

- [x] 1. **Implement the Dual-Mode EnergyBarService with TTS Fallback Model**
  - [x] 1.1. Create a new file for the `EnergyBarService`.
  - [x] 1.2. Implement state for `stsEnergyLevel` (initialized to 3) and `ttsEnergyLevel` (initialized to 2). (Ref: Req 2.1.1)
  - [x] 1.3. Implement `stsModelTier` and `ttsModelTier` state and the mappings from energy level to model names for both modes, with TTS fallback model at level 1. (Ref: Design "Data Models")
  - [x] 1.4. Implement the `getCurrentEnergyLevel(mode)` method. (Ref: Design "Components and Interfaces")
  - [x] 1.5. Implement the `handleRateLimitError(mode)` method to decrement the energy level for the specified mode. (Ref: Req 2.1.2)
  - [x] 1.6. Implement the `resetEnergyLevel(reason, mode)` method to set the energy level to maximum for the specified mode (3 for STS, 2 for TTS). (Ref: Req 2.1.3)
  - [x] 1.7. Integrate with the `DebugLoggingSystem` to log all state changes with the correct mode. (Ref: Req 2.1.4)
  - [x] 1.8. Update TTS model mapping to use `gemini-2.0-flash-live-001` as fallback at energy level 1. (Ref: Req 2.1.2)

- [x] 2. **Integrate EnergyBarService with the Application**
  - [x] 2.1. Modify the `Rate Limit Detector` to call `EnergyBarService.handleRateLimitError()` with the correct mode (`sts` or `tts`) upon detecting a rate limit error.
  - [x] 2.2. Modify the `STS Session Connector` to call `EnergyBarService.resetEnergyLevel()` for the `sts` mode on a new session connection.

- [x] 3. **Create Dual-Session Energy Indicators**
  - [x] 3.1. ✅ STS Energy Indicator is already implemented and functioning perfectly in call header area. (Ref: Req 2.2.1)
  - [x] 3.2. Create TTS Energy Indicator component for chat interface. (Ref: Req 2.2.2)
    - [x] Implement battery-style icon with 3 levels (0-2) for TTS mode
    - [x] Add appropriate colors and animations for state changes
    - [x] Ensure visibility in chat header when chat interface is displayed
  - [x] 3.3. Implement independent indicator updates. (Ref: Req 2.2.3)
    - [x] STS indicator already responds correctly to STS energy changes
    - [x] TTS indicator only responds to TTS energy changes
    - [x] Remove old main battery bar component from status bar

- [x] 4. **Update the Persona Service (Mode-Aware)**
  - [x] 4.1. Modify the `Persona Service` to be aware of the `currentEnergyLevel` and `mode`.
  - [x] 4.2. Implement the `getPromptForEnergyLevel(level, persona, mode)` method to return the correct persona-specific prompt for each energy level (2, 1, 0) for the **STS mode**. (Ref: Req 2.3.1)
  - [x] 4.3. Ensure no special prompt is returned when the energy level is 3.
  - [x] 4.4. Add TTS prompts for all energy levels (2, 1, 0) with persona-specific greetings and degraded state messages. (Ref: Req 2.3.2)

- [x] 4.5. **Implement TTS Prompt Injection into Chat Window**
  - [x] 4.5.1. Modify the energy level change handler to inject ALL TTS prompts directly into the chat window as model messages.
  - [x] 4.5.2. Add `_appendTextMessage` method to inject messages directly into the text transcript.
  - [x] 4.5.3. Ensure TTS level 2 greetings encourage user interaction and feel welcoming. (Ref: Req 2.3.2)
  - [x] 4.5.4. Ensure TTS level 1 and 0 prompts provide clear feedback about energy state changes in the chat. (Ref: Req 2.3.2)

  - [x] 4.5.5. Ensure that injected TTS prompts (greetings, energy state changes) do not include a timestamp. (Ref: Req 2.3.3)
- [x] 5. **Implement Testing Strategy (Dual-Mode)**
  - [x] 5.1. Create unit tests for the `EnergyBarService` to verify state transitions and logging for both modes independently.
  - [x] 5.2. Create unit tests for the `Persona Service` to verify correct, mode-aware prompt selection.
  - [x] 5.3. Create unit tests for the `UI Component` to verify it only responds to STS visual states.
  - [x] 5.4. Create integration tests for mode-specific `Rate Limit Detector` and `STS Session Connector` integrations.
  - [x] 5.5. Create an end-to-end test to simulate a full user session with energy level changes in both modes to verify isolation.
- [ ] 6. **Implement Conditional Affective Dialog**
  - [x] 6.1. Update the `EnergyBarService` to expose a method that returns whether affective dialog should be enabled based on STS energy level. (Ref: Req 2.1.5)
  - [x] 6.2. Integrate the new `EnergyBarService` method into the call session management logic to conditionally set the `enable_affective_dialog` flag in the API configuration. (Ref: Req 2.1.5)
  - [ ] 6.3. Add new unit tests to verify that the `enable_affective_dialog` flag is correctly set for STS energy levels 3, 2, 1, and 0. (Ref: Req 2.1.5)