# Project Structure

The project follows a root-level, domain-driven architecture to improve modularity, scalability, and maintainability. Source code is organized according to its business domain, eliminating the traditional `src/` directory.

## Root-Level Domains

-   **`app/`**: Contains the main application entry point (`main.tsx`) and global environment type definitions.
-   **`components/`**: Houses reusable UI components that are not specific to any single feature (e.g., `SettingsMenu`, `ToastNotification`).
-   **`features/`**: Contains self-contained modules representing distinct business domains (e.g., `persona`, `summarization`).
-   **`services/`**: Holds services that provide cross-cutting functionality, such as logging (`DebugLogger`) or energy management (`EnergyBarService`).
-   **`store/`**: Manages data persistence and state, such as the vector store (`VectorStore`).
-   **`visuals/`**: Contains components and logic related to 3D rendering and visual effects, including audio analysis (`analyser.ts`).
-   **`live2d/`**: Contains all files related to the Live2D integration, including the canvas, model management, and audio mapping.
-   **`shared/`**: A repository for shared code, including common types, utility functions, and hooks that are used across multiple domains.
-   **`tests/`**: For end-to-end tests, integration tests, and any test setup that spans multiple domains.

## Naming Conventions

-   Components use kebab-case custom elements (`gdm-live-audio`)
-   Files use kebab-case (`settings-menu.ts`)
-   Classes use PascalCase (`GdmLiveAudio`)
-   Private methods prefixed with underscore (`_toggleSettings`)

## Architecture Patterns

-   Web Components with Lit decorators (`@customElement`, `@state`, `@property`)
-   Event-driven communication between components
-   Reactive properties for state management
-   Shadow DOM for component encapsulation

## UI Layout & Mode Behavior

- Grid layout: three columns `400px 1fr 400px`.
  - Left panel (400px): tabbed interface containing Chat or Call History.
  - Center (1fr): Live2D model area; must remain unobstructed at all times.
  - Right panel (400px): Call transcript area, visible only during a call.

### Left Panel (Tabbed Interface)
- Element: `.main-container` (contains `<tab-view>` and either `<chat-view>` or `<call-history-view>`)
- Behavior:
  - Default mode is texting. The left panel is visible and shows the tab bar and selected tab contents.
  - When a call starts (`activeMode === "calling"`), the left panel fades out (opacity/visibility transition ~200ms) using a CSS class: `.main-container.hidden`.
  - The grid columns remain fixed; we do NOT collapse the left column so the right panel stays on the right.
- Tabs (`<tab-view>`):
  - Tabs: Chat, Call History.
  - `visible` boolean attribute used to hide the tab bar when calling.
  - Chat view reuses the same auto-scroll + scroll-to-bottom logic as call transcript.

### Center Area (Live2D)
- Element: `<live2d-gate>` behind UI (z-index below UI overlay) to keep the model unobstructed.
- Status toast (`#status`) is hidden while calling; call progress appears in the right panel header.

### Right Panel (Call Transcript)
- Element: `<call-transcript>` with `visible` boolean attribute to toggle view.
- Behavior:
  - Visible only when `activeMode === "calling"`.
  - Fades in/out with opacity/visibility transition (~200ms) and pointer-events disabled while hidden.
  - Header displays call progress via `callState`: "connecting" | "active" | "ending" | "idle".
  - Call progress/status UI must appear here (never over the center Live2D area).

### Mode Switching Flow
- Start call:
  - `activeMode = "calling"`, `callState = "connecting"` → left panel fades out, right transcript fades in.
  - On media ready: `callState = "active"`. Bottom-center status toast is suppressed during the call.
- End call:
  - `callState = "ending"` then `"idle"`; `activeMode = "texting"` → right fades out, left fades back in.
  - Call transcript is cleared and summarized; summary is added to Call History.

### Scroll & Controls
- Both Chat and Call Transcript use `transcript-auto-scroll` with `scroll-state-changed` events.
- `controls-panel` mirrors scroll-to-bottom buttons for both sides; buttons show only when appropriate.

### Key Components & State
- Components: `chat-view`, `call-transcript`, `tab-view`, `call-history-view`, `controls-panel`, `toast-notification`.
- State (in `gdm-live-audio`): `activeMode`, `isCallActive`, `callState`, `activeTab`, `textTranscript`, `callTranscript`, `textSession`, `callSession`.
- Session managers: `TextSessionManager`, `CallSessionManager` handle lifecycle and audio streaming.