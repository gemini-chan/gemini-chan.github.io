# Addendum: Dual-Mode Energy Bar Design

This addendum updates the Energy Bar System to respect the Dual-Input Mode (TTS vs STS) so that energy degradation for one mode does not impact the other.

## 1. Overview
- Maintain independent energy levels per mode:
  - STS (speech-to-speech, live calls)
  - TTS (text-to-speech, chat)
- Each mode has its own 0..3 tiered energy mapped to a mode-specific model tier.
- Rate-limit events only reduce the energy of the corresponding mode.
- Session start for a mode (e.g., new call) resets only that mode's energy to 3.

## 2. API
- getCurrentEnergyLevel(mode: 'sts' | 'tts'): 0|1|2|3
- getCurrentModel(mode: 'sts' | 'tts'): string|null
- getModelForLevel(level, mode): string|null
- handleRateLimitError(mode): void
- resetEnergyLevel(reason, mode): void
- setEnergyLevel(level, reason, mode): void
- Event: `energy-level-changed` detail includes `{ mode, level, prevLevel, reason, modelTier }`

## 3. Model Tier Mapping
- STS:
  - 3: gemini-2.5-flash-exp-native-audio-thinking-dialog
  - 2: gemini-2.5-flash-preview-native-audio-dialog
  - 1: gemini-2.5-flash-live-preview
  - 0: null
- TTS:
  - 3/2/1: gemini-live-2.5-flash-preview
  - 0: null

## 4. UI
- Energy Bar in Call Transcript and Controls Panel shows STS energy only.
- Future extension: show a compact TTS energy indicator in the Chat header if desired.

## 5. Persona-driven prompts (Call/STS)
- Level 3: no prompt.
- Level 2: immersive message that cognitive capabilities might degrade, persona-aware.
- Level 1: immersive message that the emotional scanner is offline, basic voice analysis available.
- Level 0: immersive “sleepy” prompt indicating consciousness reached zero, needs recharge.

Prompts for TTS are independent and can be added later.

## 6. Error Handling
- When tier 1 is selected for STS, remove `enableAffectiveDialog` from the request config to ensure compatibility with basic models.
- Exhausted state (0) surfaces a distinct UX message and blocks session start.

## 7. Testing
- Unit tests for STS and TTS energy level transitions and event emissions.
- Integration test simulating rate-limit events for each mode independently.
- UI tests verifying that the STS energy bar updates only on STS events.
