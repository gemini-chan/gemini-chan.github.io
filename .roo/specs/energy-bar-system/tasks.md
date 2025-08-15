# Implementation Plan: Energy Bar System (Dual-Mode)

- [x] 1. **Implement the Dual-Mode EnergyBarService**
  - [x] 1.1. Create a new file for the `EnergyBarService`.
  - [x] 1.2. Implement state for `stsEnergyLevel` and `ttsEnergyLevel`, initialized to 3. (Ref: Req 2.1.1)
  - [x] 1.3. Implement `stsModelTier` and `ttsModelTier` state and the mappings from energy level to model names for both modes. (Ref: Design "Data Models")
  - [x] 1.4. Implement the `getCurrentEnergyLevel(mode)` method. (Ref: Design "Components and Interfaces")
  - [x] 1.5. Implement the `handleRateLimitError(mode)` method to decrement the energy level for the specified mode. (Ref: Req 2.1.2)
  - [x] 1.6. Implement the `resetEnergyLevel(reason, mode)` method to set the energy level to 3 for the specified mode. (Ref: Req 2.1.3)
  - [x] 1.7. Integrate with the `DebugLoggingSystem` to log all state changes with the correct mode. (Ref: Req 2.1.4)

- [x] 2. **Integrate EnergyBarService with the Application**
  - [x] 2.1. Modify the `Rate Limit Detector` to call `EnergyBarService.handleRateLimitError()` with the correct mode (`sts` or `tts`) upon detecting a rate limit error.
  - [x] 2.2. Modify the `STS Session Connector` to call `EnergyBarService.resetEnergyLevel()` for the `sts` mode on a new session connection.

- [x] 3. **Create the Energy Bar UI Component (STS Only)**
  - [x] 3.1. Create a new UI component for the Energy Bar. (Ref: Req 2.2.1)
  - [x] 3.2. Implement the visual representation of the battery icon with 3 bars.
  - [x] 3.3. Implement logic to update the number of filled bars based on the `stsEnergyLevel` from the application state. (Ref: Req 2.2.2)
  - [x] 3.4. Implement logic to change the icon's color based on the `stsEnergyLevel`. (Ref: Req 2.2.2)
  - [x] 3.5. Ensure the component **does not** react to changes in `ttsEnergyLevel`.
  - [x] 3.6. Implement animations for state changes (draining and filling).

- [x] 4. **Update the Persona Service (Mode-Aware)**
  - [x] 4.1. Modify the `Persona Service` to be aware of the `currentEnergyLevel` and `mode`.
  - [x] 4.2. Implement the `getPromptForEnergyLevel(level, persona, mode)` method to return the correct persona-specific prompt for each energy level (2, 1, 0) for the **STS mode**. (Ref: Req 2.3.1)
  - [x] 4.3. Ensure no special prompt is returned when the energy level is 3.

- [x] 5. **Implement Testing Strategy (Dual-Mode)**
  - [x] 5.1. Create unit tests for the `EnergyBarService` to verify state transitions and logging for both modes independently.
  - [x] 5.2. Create unit tests for the `Persona Service` to verify correct, mode-aware prompt selection.
  - [x] 5.3. Create unit tests for the `UI Component` to verify it only responds to STS visual states.
  - [x] 5.4. Create integration tests for mode-specific `Rate Limit Detector` and `STS Session Connector` integrations.
  - [x] 5.5. Create an end-to-end test to simulate a full user session with energy level changes in both modes to verify isolation.