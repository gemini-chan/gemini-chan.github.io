# Technical Design: Energy Bar System (Dual-Session Indicators)

### Overview

This document outlines the technical design for the **Energy Bar System** feature, designed to work seamlessly with the **Dual-Input Mode** (see `../dual-input-mode/design.md`). The goal is to gracefully manage the AI's conversational capabilities by dynamically switching between different Gemini models as rate limits are exhausted, while providing clear session-specific feedback to users.

This is achieved by maintaining **independent energy levels** for the two primary interaction sessions:
- **STS (Speech-to-Speech):** For live, ephemeral voice calls with indicators in the call interface.
- **TTS (Text-to-Speech):** For persistent text-based chat with indicators in the chat interface.

The solution involves a central state management service (`EnergyBarService`) to track energy levels for each session, dedicated UI indicators within their respective interfaces, and integration with the existing persona and logging systems. This design aligns with the dual-input-mode philosophy of separate, contextual interfaces for each interaction type.

### Architecture

The architecture uses an event-driven model where the `EnergyBarService` acts as the single source of truth for the AI's energy state, now tracked per-mode.

```mermaid
graph TD
    subgraph "Interaction Modes"
        A[Rate Limit Detector - STS Call]
        B[Rate Limit Detector - TTS Chat]
        C[STS Session Connector]
    end

    subgraph "State Management"
        D(EnergyBarService)
        E{Application State}
    end

    subgraph "UI & Persona"
        F[STS Energy Indicator - Call Interface]
        G[TTS Energy Indicator - Chat Interface]
        H[Persona Service]
        I((Debug Logging System))
    end

    A -- "Notifies of STS Error" --> D;
    B -- "Notifies of TTS Error" --> D;
    C -- "Notifies of New STS Session" --> D;
    D -- "Updates State (STS/TTS)" --> E;
    E -- "Notifies of STS Change" --> F;
    E -- "Notifies of TTS Change" --> G;
    E -- "Notifies of Change" --> H;
    D -- "Sends Log (STS/TTS)" --> I;
```

**Data Flow:**
1.  The `EnergyBarService` is initialized with full energy levels: STS at level 3 and TTS at level 2 (maximum for each mode).
2.  A `Rate Limit Detector` for a given mode (e.g., an error during a call) notifies the `EnergyBarService`, specifying the mode (`sts` or `tts`).
3.  The `EnergyBarService` decrements the energy level for **only the specified mode** and updates the central `Application State`.
4.  The `STS Session Connector` notifies the `EnergyBarService` when a new call session begins, and the service resets the **STS energy level** to 3.
5.  The `STS Energy Indicator` subscribes to state changes and updates the visual icon within the call interface **only for STS energy changes**.
6.  The `TTS Energy Indicator` subscribes to state changes and updates the visual icon within the chat interface **only for TTS energy changes**.
7.  The `Persona Service` receives energy level changes for both modes and can provide mode-specific conversational prompts.
8.  All state changes within the `EnergyBarService` are logged with their corresponding mode.

### Components and Interfaces

#### 1. EnergyBarService
*   **Responsibility:** Manages the energy level state for both STS and TTS modes, including initialization, decrementing, and resetting.
*   **Interface:**
    *   `getCurrentEnergyLevel(mode: 'sts' | 'tts'): number`
    *   `getCurrentModel(mode: 'sts' | 'tts'): string | null`
    *   `getModelForLevel(level: number, mode: 'sts' | 'tts'): string | null`
    *   `handleRateLimitError(mode: 'sts' | 'tts'): void`
    *   `resetEnergyLevel(reason: string, mode: 'sts' | 'tts'): void`
    *   `setEnergyLevel(level: number, reason: string, mode: 'sts' | 'tts'): void`
*   **Events:**
    *   `energy-level-changed`: Dispatched with detail `{ mode, level, prevLevel, reason, modelTier }`.

#### 2. STS Energy Indicator
*   **Responsibility:** Displays the battery-style icon within the call interface during active calls. Shows STS energy levels (0-3) with appropriate colors and animations.
*   **Interface:**
    *   `updateEnergyLevel(level: number): void`
*   **Visibility:** Only visible during active calls within the call controls area.

#### 3. TTS Energy Indicator  
*   **Responsibility:** Displays the battery-style icon within the chat interface header. Shows TTS energy levels (0-2) with appropriate colors and animations.
*   **Interface:**
    *   `updateEnergyLevel(level: number): void`
*   **Visibility:** Always visible in the chat header when the chat interface is displayed.

#### 3. Persona Service (Existing, Modified)
*   **Responsibility:** Selects and provides the appropriate conversational prompt based on the current energy level, selected persona, and interaction mode.
*   **Interface (New/Modified):**
    *   `getPromptForEnergyLevel(level: number, persona: string, mode: 'sts' | 'tts'): string`

### Data Models

#### Energy State
The application state now stores two independent energy pools with different level ranges.

| State Property      | Type     | Constraints | Description                               |
|---------------------|----------|-------------|-------------------------------------------|
| `stsEnergyLevel`    | `number` | `0, 1, 2, 3`| The current energy level for the STS mode.|
| `ttsEnergyLevel`    | `number` | `0, 1, 2`   | The current energy level for the TTS mode (simplified 3-level system).|
| `stsModelTier`      | `string` |             | The corresponding AI model for the STS level.|
| `ttsModelTier`      | `string` |             | The corresponding AI model for the TTS level.|

**Model Tier Mapping:**
*   **STS Mode (Calling):**
    *   **Level 3:** `gemini-2.5-flash-exp-native-audio-thinking-dialog`
    *   **Level 2:** `gemini-2.5-flash-preview-native-audio-dialog`
    *   **Level 1:** `gemini-2.5-flash-live-preview`
    *   **Level 0:** No model / Exhausted state
*   **TTS Mode (Chat):**
    *   **Level 2:** `gemini-live-2.5-flash-preview` (stable primary model)
    *   **Level 1:** `gemini-2.0-flash-live-001` (fallback model for degraded performance)
    *   **Level 0:** No model / Exhausted state

**TTS Energy Level Design Rationale:**
The TTS mode uses a simplified 3-level system (2, 1, 0) instead of 4 levels to avoid redundant model reconnections. Since levels 3 and 2 would use the same model (`gemini-live-2.5-flash-preview`), combining them into a single level 2 eliminates unnecessary switching while maintaining the same functionality. The fallback model (`gemini-2.0-flash-live-001`) is only used at level 1, providing a stable degraded experience when the primary model hits rate limits.

### Persona-driven Prompts (Call/STS)
As defined in the `dual-input-mode` requirements, the STS flow has specific immersive prompts:
- **Level 3:** No prompt.
- **Level 2:** Immersive message that cognitive capabilities might degrade.
- **Level 1:** Immersive message that the emotional scanner is offline, but basic voice analysis is available.
- **Level 0:** Immersive “sleepy” prompt indicating consciousness has reached zero and needs to recharge.

### Error Handling & Compatibility

| Error Condition                   | Handling Component  | Action                                                                   |
|-----------------------------------|---------------------|--------------------------------------------------------------------------|
| Invalid energy level (e.g., > 3)  | `EnergyBarService`  | Log a warning and default to a safe state (e.g., 3 or 0).                |
| UI fails to render icon           | `UI Component`      | Log the error; the feature will fail gracefully (icon will not be visible).|
| Persona prompt not found          | `Persona Service`   | Log a warning and return a default, generic prompt for that energy level.|
| Basic model tier for STS          | `CallSessionManager`| Omit `enableAffectiveDialog` from the request config to ensure compatibility. |

### Testing Strategy

*   **Unit Tests:**
    *   `EnergyBarService`: Test state transitions (initialization, decrementing, reset) for **both STS and TTS modes independently**. Verify that events are emitted with the correct `mode`.
    *   `Persona Service`: Test that the correct prompt is returned for each combination of energy level, persona, and **mode**.
    *   `UI Component`: Test that the component correctly renders the icon for each STS energy level and **ignores TTS energy changes**.
*   **Integration Tests:**
    *   Test the flow from a **STS rate limit** -> `EnergyBarService` -> `Application State` -> `UI Component` to ensure the icon updates.
    *   Test the flow from a **TTS rate limit** -> `EnergyBarService` -> `Application State` and verify the `UI Component` **does not** update.
    *   Test that a new STS session resets **only the STS energy level**.
*   **End-to-End (E2E) Tests:**
    *   An automated test will simulate a full user session, triggering rate limit errors in **both STS and TTS modes** to verify system isolation and correct behavior.