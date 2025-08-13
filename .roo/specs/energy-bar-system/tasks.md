# Implementation Plan: Energy Bar System

- [ ] 1. **Implement the EnergyBarService**
  - [ ] 1.1. Create a new file for the `EnergyBarService`.
  - [ ] 1.2. Implement the `currentEnergyLevel` state, initialized to 3. (Ref: Req 2.1.1)
  - [ ] 1.3. Implement the `modelTier` state and the mapping from energy level to model name. (Ref: Design "Data Models")
  - [ ] 1.4. Implement the `getCurrentEnergyLevel()` method. (Ref: Design "Components and Interfaces")
  - [ ] 1.5. Implement the `handleRateLimitError()` method to decrement the energy level. (Ref: Req 2.1.2)
  - [ ] 1.6. Implement the `resetEnergyLevel()` method to set the energy level to 3. (Ref: Req 2.1.3)
  - [ ] 1.7. Integrate with the `DebugLoggingSystem` to log all state changes. (Ref: Req 2.1.4)

- [ ] 2. **Integrate EnergyBarService with the Application**
  - [ ] 2.1. Modify the existing `Rate Limit Detector` to call `EnergyBarService.handleRateLimitError()` upon detecting a rate limit error. (Ref: Design "Architecture")
  - [ ] 2.2. Modify the `STS Session Connector` to call `EnergyBarService.resetEnergyLevel()` on a new session connection. (Ref: Design "Architecture")

- [ ] 3. **Create the Energy Bar UI Component**
  - [ ] 3.1. Create a new UI component for the Energy Bar. (Ref: Req 2.2.1)
  - [ ] 3.2. Implement the visual representation of the battery icon with 3 bars.
  - [ ] 3.3. Implement the logic to update the number of filled bars based on the `currentEnergyLevel` from the application state. (Ref: Req 2.2.2)
  - [ ] 3.4. Implement the logic to change the icon's color based on the `currentEnergyLevel` (green, yellow, orange, red). (Ref: Req 2.2.2)
  - [ ] 3.5. Implement the animations for state changes (draining and filling). (Ref: Req 2.2.3)

- [ ] 4. **Update the Persona Service**
  - [ ] 4.1. Modify the `Persona Service` to be aware of the `currentEnergyLevel`.
  - [ ] 4.2. Implement the `getPromptForEnergyLevel()` method to return the correct persona-specific prompt for each energy level (2, 1, 0). (Ref: Req 2.3.1)
  - [ ] 4.3. Ensure no special prompt is returned when the energy level is 3. (Ref: Req 2.3.2)

- [ ] 5. **Implement Testing Strategy**
  - [ ] 5.1. Create unit tests for the `EnergyBarService` to verify state transitions and logging. (Ref: Design "Testing Strategy")
  - [ ] 5.2. Create unit tests for the `Persona Service` to verify correct prompt selection. (Ref: Design "Testing Strategy")
  - [ ] 5.3. Create unit tests for the `UI Component` to verify visual states. (Ref: Design "Testing Strategy")
  - [ ] 5.4. Create integration tests for the `Rate Limit Detector` and `STS Session Connector` integrations. (Ref: Design "Testing Strategy")
  - [ ] 5.5. Create an end-to-end test to simulate a full user session with energy level changes. (Ref: Design "Testing Strategy")