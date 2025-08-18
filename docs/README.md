# Product Overview

Gemini-chan is a real-time AI voice assistant with Live2D character visualization. The application creates an interactive VTuber-style character that users can talk to using Google's Gemini AI with live audio capabilities.

## Key Features
- Real-time voice conversation with Google Gemini AI
- Live2D character visualization that responds to audio input/output
- Animated character expressions and lip-sync capabilities
- Settings menu for API key management
- Audio processing with PCM encoding for live streaming

## Visualization Options
- **Live2D** (Current target) - Simpler 2D character animation system
- **VRM 3D Avatars** (Future consideration) - Full 3D character models with higher complexity

## Target Experience
The app aims to provide an immersive, anime-inspired AI companion experience with visual feedback that responds to both user speech and AI responses in real-time.

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

# Tech Stack

## Core Technologies
- **TypeScript** - Primary language with ES2022 target
- **Lit** - Web components framework for UI
- **Vite** - Build tool and dev server
- **Live2D** - 2D character animation and rendering
- **Google GenAI** - Real-time AI voice conversation API

## Backend Architecture
- The application is a frontend-only system that communicates directly with the Google Gemini API.
- The user's provided Google AI API key is used for all interactions with the Gemini models, acting as the sole authentication and ignition key for the system.

## Visualization Technologies
- **Live2D Cubism SDK** - Primary character animation system
- **Three.js** - Currently used for 3D sphere (to be replaced)
- **VRM** - Future consideration for 3D avatars (higher complexity)

## Key Libraries
- `@lit/context` - State management for Lit components
- `three/addons` - Post-processing effects (bloom, FXAA, EXR loading)
- `@open-wc/testing` - Web component testing utilities
- `@web/test-runner` - Test runner for web components

## Development Setup
- Uses ES modules with import maps in HTML
- Vite handles TypeScript compilation and bundling
- The `GEMINI_API_KEY` is primarily managed through the in-app settings UI.
- Path aliases configured (`@/*` maps to workspace root)

## Build Configuration
- TypeScript configured for experimental decorators (Lit requirement)
- Module resolution set to "bundler" for modern bundling

# Further Onboarding

*   [`/docs/blueprints`](docs/blueprints): Contains high-level design documents and architectural blueprints.
*   [`/docs/commands`](docs/commands): Documentation for custom commands and scripts.
*   [`/docs/inspirations`](docs/inspirations): A collection of inspirational materials, including analyses of other projects.
*   [`/docs/manuals`](docs/manuals): Detailed manuals and guides for specific technologies or processes.
*   [`/docs/research`](docs/research): Research notes and findings on various topics.
*   [`/docs/rules-agile-architect`](docs/rules-agile-architect): Rules and guidelines for the Agile Architect mode.
*   [`/docs/rules-agile-dev`](docs/rules-agile-dev): Rules and guidelines for the Agile Dev mode.
*   [`/docs/rules-agile-planner`](docs/rules-agile-planner): Rules and guidelines for the Agile Planner mode.
*   [`/docs/rules-agile-writer`](docs/rules-agile-writer): Rules and guidelines for the Agile Writer mode.
*   [`/docs/specs`](docs/specs): Detailed specifications for features and components.