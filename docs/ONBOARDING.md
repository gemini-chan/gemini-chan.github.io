# Anima Developer & Agent Onboarding Guide

Welcome! This guide brings you up to speed on the current architecture, recent refactors, conventions, and the hardening vectors we chose. It is designed for both developers and AI coding agents to continue the work confidently.

## TL;DR
- Thinking UI is now a minimal, robust badge driven by a per-turn state machine and resilient completion fallbacks. It must never get stuck.
- VPU completion signals can be flaky under load; UI must converge to Done deterministically via idle watchdog, hard max, and a dev ticker (dev-only).
- ChatView remains always mounted (visibility is toggled via props), eliminating DOM churn issues.
- Logging is centralized with configurable throttling; we added targeted, low-noise instrumentation.
- Lint & type hygiene enforced: no `any`, no unused imports/vars, and shared throttle generic.

## Project Overview

- UI toolkit: LitElement + Vite + TypeScript
- Core services:
  - NPUService (Neural Processing Unit): analysis and advisor prompt building.
  - VPUService (Voice Processing Unit): text and audio streaming, transcription, playback.
- State & shared:
  - Shared progress/event mapping: `shared/progress.ts`.
  - Shared types: `shared/types.ts`.
  - Debug logger: `services/DebugLogger.ts` with per-component throttles.

## Architecture – Current Vectors

### Thinking UI: From Panel → Minimal Badge
- We removed the expandable panel; replaced with a minimal, always-mounted badge showing:
  - Spinner: true for phases `npu` and `vpu`.
  - Status: human-friendly string derived from events (e.g., "Thinking…", "Speaking…", "Done").
- The badge is driven by a per-turn state machine in `app/main.tsx`:
  - `turnState = { id, phase: 'idle'|'npu'|'vpu'|'complete'|'error', startedAt, lastUpdateAt }`.
  - `_setTurnPhase()` maps phases to UI status/spinner.

### Resilient Completion
- Completion can fail to arrive from upstream (e.g., `generationComplete`), especially under heavy rAF load.
- We guarantee UI convergence to Done using three layers:
  1) Idle watchdog (2.2s): on no new VPU transcription or output events.
  2) Hard max (7s): absolute one-shot deadline from first VPU event.
  3) Dev ticker (250ms, dev-only): drives ETA countdown and forces completion if deadline passed.
- ChatView also runs a local badge engine in dev mode to force Done if the parent stalls, and emits `thinking-forced-complete-ui` to sync parent.

### Always-Mounted ChatView
- `ChatView` is always in the DOM; its visibility is toggled via the `.visible` prop. This prevents unmount/remount races and stale rendering.

### Event Wiring (NPU/VPU)
- NPU progress events map into status updates and concise log lines. We use a single `_handleNpuProgress()` helper.
- VPU events are centralized in `_handleVpuProgress()`; it updates status, manages timers, and drives the state machine.
- We pass `turnId` throughout to correlate events and message status.

## Logging & Throttling

- `services/DebugLogger.ts`:
  - Per-component throttling with a wildcard `*` fallback.
  - Throttling uses the shared `throttle()` utility from `shared/utils.ts` (generic, no `any`).
  - Defaults set in `main`: `*` at 250ms; scrolling categories at 1s (ChatView, transcript-auto-scroll, call-transcript).
- VPU/NPU raw logs:
  - Suppressed `npu:prompt:partial` spam.
  - Suppressed per-chunk VPU transcription logs unless `vpuDebugMode` is enabled.
  - Aggregated per-turn chunk counts with 1s summaries.
- Health metrics toggle controls debug modes (VPU/NPU) for simpler UI.

## Performance Considerations

- We removed rAF batching temporarily for correctness.
- If the event loop is heavily loaded (e.g., Pixi visuals), timeouts and intervals may be delayed. The rAF poller and the badge engine’s dev ticker help mitigate.
- Optional next step: a "reduced animation while Speaking" mode to ease event-loop pressure during VPU phase.

## Files You’ll Touch

- `app/main.tsx` (GdmLiveAudio):
  - Turn state machine and phase mapping.
  - NPU/VPU progress handlers.
  - Watchdog + hard max timers and dev-only rAF poller.
  - Props passed to ChatView: `thinkingStatus`, `thinkingActive`, `phase`, `lastEventType`, `hardDeadlineMs`, and dev label.

- `components/ChatView.ts`:
  - Minimal badge render; spinner based on phase.
  - Dev-only local badge engine (ticker) to force completion and show ETA.

- `features/vpu/VPUService.ts` (TextSessionManager):
  - Emits VPU progress events.
  - Completion via `generationComplete`, audio-end fallback, transcription-idle fallback.
  - Focused logs added to confirm which path was taken.

- `services/DebugLogger.ts`:
  - Centralized logging, throttling APIs, and a global wildcard.
  - `window.debugLogger` is exposed for runtime control (dev console).

- `shared/utils.ts`:
  - Generic `throttle()` utility with no `any` usage.

## Build & Run

- Dev: `npm run dev`
- Typecheck: `npm run type`
- Lint: `npm run lint`
- Build: `npm run build`

Ensure you have an API key; the app logs "API key changed, reinitializing client" when it takes effect.

## Coding Standards

- TypeScript strictness: no `any`. Prefer `unknown` + narrow or define small interfaces.
- Avoid duplicate exports; export functions once via declarations.
- Remove unused imports/vars (ESLint will block CI commits).
- Keep UI logic simple (KISS): badge-only status, no expand/collapse.
- Keep event handlers centralized and DRY.

## Troubleshooting Checklist

- Badge stuck at Speaking…
  - Check dev badge label: lastEventType and ETA should count down.
  - Look for: `VPU completion: generationComplete` or `audio end fallback` or `transcription idle fallback` in logs.
  - If none, UI still converges via dev ticker or rAF poller. Consider lowering hard max or enabling reduced animation.

- No badge shows on first message
  - Ensure immediate `requestUpdate()` + `await updateComplete` after setting initial "Thinking…" state.
  - Verify `ChatView` is always mounted and `.visible` toggles correctly.

- Excessive logs
  - Use `window.debugLogger.setGlobalThrottle(ms)` and `setCategoryThrottle('Category', ms)`.
  - Disable VPU/NPU debug via Health Metrics toggle.

## Hardening Playbook (What to keep tightening)

- VPU completion reliability:
  - We added logs in TextSessionManager for generationComplete, audio-end fallback, and transcription-idle. Confirm which paths fire under load.
  - If all responses produce audio (as noted), ensure `onAudioEnded()` always fires and triggers completion.

- UI convergence time:
  - Tune idle watchdog (1.5–2.2s) and hard max (5–7s) to your needs.

- Performance tuning:
  - Consider pausing heavy visuals during Speaking.

- Clean prod UI:
  - Remove dev label and rAF poller in production builds; leave the badge engine.

## Console Quick Cheats

- Throttles:
  - `window.debugLogger.setGlobalThrottle(250)`
  - `window.debugLogger.setCategoryThrottle('ChatView', 1000)`
  - `window.debugLogger.clearAllThrottles()`

- Verify phases:
  - Watch for `_setTurnPhase` logs: `{ from, to, eventType, turnId }`.

## Contributing

- Keep changes modular; delegate coding via the ai_edit tool where possible.
- Write high-signal logs (avoid per-chunk spam).
- Keep PRs small and focused on one vector (UI resiliency, VPU service reliability, or logging) at a time.

---

This guide captures the current direction: a simple, resilient Thinking badge driven by a clear state machine and robust completion fallbacks. Proceed with confidence, and prefer deterministic convergence over perfect upstream signals.
