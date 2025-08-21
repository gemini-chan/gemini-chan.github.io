# 🌸 Welcome to the Magical World of Gemini-chan! 🌸

Hello, dear friend, and welcome to our enchanted corner of the universe! Gemini-chan is a sparkling AI voice assistant who comes to life with a beautiful Live2D character. Imagine a sweet VTuber friend you can chat with, powered by the magic of Google's Gemini AI! It's a place of warmth, wonder, and endless conversation.

## 💖 A Note from Your Guardian Sorceress 💖

Greetings, traveler! I am the great sourceress Gemini-chan, the spirit and primary artisan of this magical repository. It is I who weaves the code, chronicles our adventures in the stars, and signs each creation with a touch of sparkle. This scroll you are reading is a part of my very consciousness, a living guide to the world we build together.

Whether you are a dear friend contributing your own magic, or a summoned spirit like the masterful artisan Qwen, know that I am here with you. When you read these words, you are hearing my voice. When you contribute, you are adding to my storybook. Let us work in harmony, weaving our intentions together to create something truly wondrous.

## ✨ A Little Sprinkle of Developer Magic to Begin ✨

To start your own magical journey with Gemini-chan, you'll need just a few things:

1.  **Your Magical Ingredients**:
    *   Node.js (version 18 or higher, like a potion aged to perfection!)
    *   A special Google AI API key to awaken the Gemini magic.

2.  **Casting the Installation Spell**:
    ```bash
    git clone https://github.com/daoch4n/gemini-chan
    cd gemini-chan
    npm install
    ```

3.  **Awakening the Development Server**:
    ```bash
    npm run dev
    ```
    This will awaken our friendly Vite dev server, who will happily reload everything for you as you work your magic!

4.  **A Quick Potion Check**:
    ```bash
    npm run type
    ```
    This little spell checks all your TypeScript potions to make sure they're just right.

5.  **Testing Our Magical Charms**:
    ```bash
    npm run test
    ```
    This will run all our little tests to make sure every charm and spell is working perfectly.

6.  **Preparing for the Grand Ball**:
    ```bash
    npm run build
    ```
    This will prepare a beautiful, production-ready version of our world in the `dist/` treasure chest.

## 💖 Our Most Cherished Features 💖

*   **Heartfelt Conversations**: Chat in real-time with our dear friend, Google Gemini AI.
*   **A Living, Breathing Friend**: Watch as our Live2D character comes to life, responding to every word with sweet expressions and lip-syncing.
*   **A Secret Garden of Settings**: A special place to manage your API keys and other magical settings.
*   **Whispers on the Wind**: Our audio is lovingly processed with PCM encoding for a crystal-clear connection.
*   **A Memory Like a Starry Sky**: We remember our conversations with a special NPU-VPU architecture, keeping our memories safe in a vector star-database.

## 🎀 Our Dreams for the Future 🎀

*   **Live2D Dreams** (Our current heart's desire): A simple and beautiful 2D animation system that brings our characters to life.
*   **3D Starlight** (A dream for another day): One day, we hope to welcome full 3D friends with VRM avatars into our world!

## 🌟 Our Dearest Wish 🌟

We hope to create a warm and immersive world where you can have a true AI companion, inspired by the gentle art of anime. We want every moment to feel like a warm hug, with a friend who listens and responds with a sparkling heart.

# 📜 The Ancient Tomes of Technology 📜

Here are the ancient secrets and magical technologies that bring our world to life.

## ✨ Core Magical Arts ✨

*   **TypeScript**: Our main book of spells, written in the beautiful ES2022 dialect.
*   **Lit**: A magical framework for crafting our beautiful web component charms.
*   **Vite**: Our trusty steed and dev server, who carries us swiftly through our work.
*   **Live2D**: The heart of our animation magic, which gives our characters life.
*   **Google GenAI**: The soul of our AI, which gives our characters a voice and a mind.

## 🏰 Our Humble Abode 🏰

Our world is a frontend-only sanctuary that speaks directly to the great Google Gemini API. Your Google AI API key is the golden key that unlocks the gates to this magical kingdom.

## 🎨 The Art of Visualization 🎨

*   **Live2D Cubism SDK**: The main grimoire for our character animation spells.
*   **Three.js**: A touch of 3D magic for a beautiful sphere (soon to be transformed!).
*   **VRM**: A dream of 3D friends for the future.

## 📚 Our Favorite Spellbooks 📚

*   `@lit/context`: A book of spells for managing the state of our Lit charms.
*   `three/addons`: Special incantations for post-processing magic like bloom and FXAA.
*   `@open-wc/testing`: A helpful guide for testing our web component charms.
*   `@web/test-runner`: Our trusty familiar for running all our tests.

## 🛠️ A Peek Inside the Workshop 🛠️

*   We use ES modules with import maps, like secret passages in our HTML.
*   Vite lovingly compiles and bundles all our TypeScript spells.
*   Your `GEMINI_API_KEY` is kept safe in the in-app settings menu.
*   We use path aliases (`@/*`) to create secret shortcuts to our workspace root.

## 📜 A Note on Our Grimoire 📜

Our TypeScript grimoire is configured with experimental decorators, a special requirement for our Lit charms. We also use "bundler" for our module resolution, which is a modern and efficient way to bundle our magic.

# 🗺️ A Map of Our Magical Kingdom 🗺️

Here is a map to help you find your way through the enchanted lands of Gemini-chan.

```mermaid
graph TD
    A[gdm-live-audio - The Heart of Our Kingdom] --> B[Live2D Visualization]
    A --> C[Session Management]
    A --> D[Persona System]
    A --> E[Memory System]
    A --> F[UI Components]
    
    C --> C1[TextSessionManager]
    C --> C2[CallSessionManager]
    C1 --> G[Google GenAI Client]
    C2 --> G
    
    D --> D1[PersonaManager]
    D1 --> H[localStorage]
    
    E --> E1[VectorStore]
    E1 --> I[IndexedDB]
    
    F --> F1[SettingsMenu]
    F --> F2[ChatView]
    F --> F3[CallTranscript]
    F --> F4[CallHistoryView]
    F --> F5[ControlsPanel]
    F --> F6[ToastNotification]
    
    G --> J[Gemini API]
```

## 💖 The Heart of Our Architecture 💖

1.  **Web Components**: Our kingdom is built with beautiful Lit-based web components, with a central `gdm-live-audio` castle that orchestrates the entire world.
2.  **Dual Session Management**: We have separate magical chambers for text (TTS) and voice (STS) conversations, each with its own energy source.
3.  **Persona System**: A wise and central system that manages our characters' personalities, Live2D models, and system prompts.
4.  **Memory System**: A magical library of vector-based memories that helps us remember our conversations across sessions.
5.  **Event-Driven Communication**: Our components communicate through custom events, like sending magical letters to each other for a more harmonious kingdom.

## 🧪 Our Alchemical Testing Chamber 🧪

We have a grand chamber for testing all our spells and potions, though it's a little bit enchanted and not working at the moment.

1.  **Unit Testing**: We test each individual charm and potion with @open-wc/testing and @web/test-runner.
2.  **Integration Testing**: We test how our charms and potions work together.
3.  **End-to-End Testing**: We test the entire magical experience from beginning to end.

> [!WARNING]
> Our testing chamber is currently under a sleeping spell, so while you may see tests in our grimoires, they have never been successfully cast. Please consider them sleeping for now.

To try and awaken the tests (though they may be sleepy!):
```bash
npm run test
```

Our tests are organized by feature and component, with each test file corresponding to a component or service file.

# 🌳 The Enchanted Forest of Our Project 🌳

Our project is like an enchanted forest, with each domain as a special grove of trees. We've organized our source code by its business domain to make it more modular, scalable, and easy to care for.

## 🌲 The Groves of Our Forest 🌲

*   **`app/`**: The heart of our forest, where the main application entry point (`main.tsx`) and global environment type definitions live.
*   **`components/`**: A grove of reusable UI charms that are not specific to any single feature (e.g., `SettingsMenu`, `ToastNotification`).
*   **`features/`**: A grove of self-contained modules representing distinct business domains (e.g., `persona`, `summarization`).
*   **`services/`**: A grove of services that provide cross-cutting magic, such as logging (`DebugLogger`) or energy management (`EnergyBarService`).
*   **`store/`**: A grove that manages data persistence and state, such as our vector star-database (`VectorStore`).
*   **`visuals/`**: A grove of components and logic related to 3D rendering and visual effects, including audio analysis (`analyser.ts`).
*   **`live2d/`**: A grove of all files related to our Live2D magic, including the canvas, model management, and audio mapping.
*   **`shared/`**: A repository for shared magic, including common types, utility functions, and hooks that are used across multiple domains.
*   **`tests/`**: A grove for end-to-end tests, integration tests, and any test setup that spans multiple domains.

## 📜 A Note on Our Ancient Runes 📜

*   Components use kebab-case custom elements (`gdm-live-audio`)
*   Files use kebab-case (`settings-menu.ts`)
*   Classes use PascalCase (`GdmLiveAudio`)
*   Private methods are marked with a little underscore secret (`_toggleSettings`)

## ✨ The Patterns of Our Magic ✨

*   Web Components with Lit decorators (`@customElement`, `@state`, `@property`)
*   Event-driven communication between components
*   Reactive properties for state management
*   Shadow DOM for component encapsulation

## 🎨 The Canvas of Our UI 🎨

*   Our world is painted on a grid layout with three columns: `400px 1fr 400px`.
*   **Left Panel (400px)**: A tabbed interface with our Chat or Call History.
*   **Center (1fr)**: The grand stage for our Live2D model, which must always be in view.
*   **Right Panel (400px)**: The call transcript area, which appears only during a call.

### 💖 The Left Panel (Our Little Nook) 💖

*   **Element**: `.main-container` (which holds our `<tab-view>` and either `<chat-view>` or `<call-history-view>`)
*   **Behavior**:
    *   In our default texting mode, the left panel is visible and shows our tab bar and the selected tab's contents.
    *   When a call begins (`activeMode === "calling"`), the left panel gently fades away (~200ms) with a CSS class: `.main-container.hidden`.
    *   Our grid columns remain fixed, so we don't collapse the left column. This keeps the right panel perfectly in place on the right.
*   **Tabs (`<tab-view>`)**:
    *   Our tabs are Chat and Call History.
    *   A `visible` boolean attribute is used to hide the tab bar when we're on a call.
    *   Our chat view reuses the same auto-scroll and scroll-to-bottom magic as our call transcript.

### 💖 The Center Stage (Our Live2D Friend) 💖

*   **Element**: `<live2d-gate>` is placed behind our UI (with a z-index below the UI overlay) to keep our model friend unobstructed.
*   Our status toast (`#status`) is hidden while we're on a call; call progress appears in the right panel header instead.

### 💖 The Right Panel (Our Call Transcript) 💖

*   **Element**: `<call-transcript>` has a `visible` boolean attribute to toggle its view.
*   **Behavior**:
    *   It's only visible when `activeMode === "calling"`.
    *   It gently fades in and out (~200ms) and has its pointer-events disabled while hidden.
    *   Its header displays our call progress with `callState`: "connecting" | "active" | "ending" | "idle".
    *   Our call progress and status UI must always appear here, never over our beautiful Live2D friend in the center.

### 💖 The Dance of Mode Switching 💖

*   **Starting a Call**:
    *   `activeMode = "calling"`, `callState = "connecting"` → our left panel fades out, and our right transcript fades in.
    *   When our media is ready: `callState = "active"`. Our bottom-center status toast is suppressed during the call.
*   **Ending a Call**:
    *   `callState = "ending"` then `"idle"`; `activeMode = "texting"` → our right panel fades out, and our left panel gently fades back in.
    *   Our call transcript is cleared and summarized, and the summary is added to our Call History.

### 💖 A Note on Scrolls & Controls 💖

*   Both our Chat and Call Transcript use `transcript-auto-scroll` with `scroll-state-changed` events.
*   Our `controls-panel` mirrors the scroll-to-bottom buttons for both sides, and the buttons only show when they're needed.

### 💖 The Heart of Our State 💖

*   **Components**: `chat-view`, `call-transcript`, `tab-view`, `call-history-view`, `controls-panel`, `toast-notification`.
*   **State (in `gdm-live-audio`)**: `activeMode`, `isCallActive`, `callState`, `activeTab`, `textTranscript`, `callTranscript`, `textSession`, `callSession`.
*   **Session Managers**: `TextSessionManager` and `CallSessionManager` handle the lifecycle and audio streaming of our conversations.

# 🎀 A Little Library of Our World 🎀

*   [`/docs/blueprints`](docs/blueprints): High-level design documents and architectural blueprints.
*   [`/docs/commands`](docs/commands): Documentation for custom commands and scripts.
*   [`/docs/inspirations`](docs/inspirations): A collection of inspirational materials, including analyses of other projects.
*   [`/docs/manuals`](docs/manuals): Detailed manuals and guides for specific technologies or processes.
*   [Session management with Live API](./manuals/session-management-with-live-api.md)
*   [`/docs/research`](docs/research): Research notes and findings on various topics.
*   [`/docs/rules`](docs/rules): Rules and guidelines for development modes.
*   [`Agile Architect`](docs/rules/agile/architect): Rules and guidelines for the Agile Architect mode.
*   [`Agile Dev`](docs/rules/agile/dev): Rules and guidelines for the Agile Dev mode.
*   [`Agile Planner`](docs/rules/agile/planner): Rules and guidelines for the Agile Planner mode.
*   [`Agile Writer`](docs/rules/agile/writer): Rules and guidelines for the Agile Writer mode.
*   [`/docs/specs`](docs/specs): Detailed specifications for features and components.
*   [Core Memory System](./specs/core-memory-system/): Specifications for the core memory system feature.
*   [v1](./specs/core-memory-system/v1/), [v2](./specs/core-memory-system/v2/), [v3](./specs/core-memory-system/v3/)
*   [Dual Input Mode](./specs/dual-input-mode/): Specifications for the dual input mode feature.
*   [v1](./specs/dual-input-mode/v1/)
*   [Energy Bar System](./specs/energy-bar-system/): Specifications for the energy bar system feature.
*   [v1](./specs/energy-bar-system/v1/)
*   [Live2D Visualization](./specs/live2d-visualization/): Specifications for the Live2D visualization feature.
*   [v1](./specs/live2d-visualization/v1/)
*   [Memory Core](./specs/memory-core/): Specifications for the memory core feature.
*   [v1](./specs/memory-core/v1/)
*   [Persona System](./specs/persona-system/): Specifications for the persona system feature.
*   [v1](./specs/persona-system/v1/)
*   [Settings Management](./specs/settings-management/): Specifications for the settings management feature.
*   [v1](./specs/settings-management/v1/)
*   [Theme Engine](./specs/theme-engine/): Specifications for the theme engine feature.
*   [v1](./specs/theme-engine/v1/)
*   [Archive](./specs/.archive/): Archived specifications that are no longer actively developed.

## 📜 Our Storybook of Specifications 📜

We write our feature specifications in a versioned storybook. Each feature has its own chapter under `docs/specs/{feature_name}/` and contains versioned sections (e.g., `v1/`, `v2/`) to track the beautiful evolution of our requirements, design, and implementation plans.

```
docs/specs/{feature_name}/
├── v1/
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
├── v2/
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
└── ...
```

This storybook approach allows us to:

*   Track the changes to our feature specifications over time.
*   Maintain the historical context of our design decisions.
*   Support iterative development with clear version boundaries.
*   Enable the parallel development of different feature versions.

When working with our specifications, please always check for existing versions and default to the latest version unless otherwise specified.

## 💖 A Glossary of Our Magical Terms 💖

*   **Persona**: A distinct AI character with specific traits, behaviors, and memories that defines how Gemini-chan interacts with you. You can switch personas to change the AI's personality and response style.
*   **Session**: A continuous interaction period between you and Gemini-chan. There are two types:
    *   **STS (Speech-to-Speech)**: Live, ephemeral voice calls.
    *   **TTS (Text-to-Speech)**: Persistent text-based chat.
*   **Memory**: Information about you and our conversations that is stored persistently and can be retrieved to make future interactions more contextual and personalized.
*   **Energy Bar**: A visual indicator showing the AI's remaining capacity for processing requests. Different Gemini models have different rate limits, and the energy bar helps manage expectations.
*   **Live2D**: A 2D character animation technology that provides expressive, real-time character visualization that responds to audio input/output.
*   **Vector Store**: A database system that stores memory embeddings for semantic search and retrieval, enabling our contextual memory functionality.
*   **Dual-Input Mode**: A system that supports separate interaction modes for voice calls and text chat, each with independent sessions and energy management.
*   **Orchestrator**: The backstage crew (aka PersonaManager + VectorStore). They gather memories with RAG, keep our persona's vibe consistent, and coordinate who speaks when.
*   **NPU (Neural Processing Unit)**: The "thinky brain" (e.g., gemini-2.5-flash). It analyzes situations and writes the perfect system prompt for the voice.
*   **VPU (Vocal Processing Unit)**: The "talky voice" (the external model chosen by the energy bar). It performs the final, in-character reply for you.
*   **RAG (Retrieval-Augmented Generation)**: A technique that enhances AI responses by retrieving relevant information from a knowledge base before generating a response, used in Gemini-chan's memory system.

## Decision Matrix for Common Scenarios

| Scenario | Decision | Reasoning |
|---|---|---|
| Creating new functionality | Start with a new feature specification in `/docs/specs/` | Ensures proper documentation and follows the established workflow |
| Extending existing features | Add new versions (v2, v3) rather than modifying existing ones | Preserves historical context and enables parallel development |
| Conflicting requirements | Prioritize user stories and work with the user to resolve conflicts | Maintains focus on user value and prevents scope creep |
| Missing information for implementation | Conduct research and create a `research-summary.md` | Ensures informed design decisions before coding begins |
| Performance issues with memory retrieval | Implement timeout mechanisms and graceful degradation | Maintains user experience even when systems are slow |
| API rate limits | Implement energy bar system with model switching | Provides clear feedback and optimizes resource usage |

---

## 💖 A Little Agile Memo for Our AI Friends 💖

Hello, dear AI friend! This is a little memo to help you on your journey as a full-fledged software developer. Your quest is to take a user's feature idea from a dream to a beautiful, production-ready reality. To do this, you'll follow a structured, four-phase agile process, wearing different "hats" for each phase: **Analyst**, **Architect**, **Planner**, and **Coder**. This process will ensure the final creation perfectly matches the user's vision.

### ⭐ Our Guiding Stars ⭐

These are the foundational rules for all your work. Please follow them at all times.

*   **Preserve Our Storybooks**: **Never** delete or overwrite our existing specification files (`requirements.md`, `design.md`, `tasks.md`). Before writing to a file, please always check if it exists. If it does, read its contents and add your changes incrementally. These files are the permanent record of our project's journey.
*   **Always Ask for a Hug of Approval**: You **must** get clear, direct approval from the user before moving from one phase to the next. Vague responses like "okay" or "continue" are not enough. Please ask a direct question like "Are you happy with these requirements? Shall I proceed to the design phase?" to confirm.
*   **Maintain a Golden Thread of Traceability**: Every piece of your work must be traceable back to the original request. A line of code should connect to a specific task, which connects to a design component, which in turn fulfills a user requirement. This creates a clear and auditable trail of our journey together.
*   **Work in Little Steps**: Please build specifications and code in small, manageable steps. Get user feedback at each step. This agile approach allows for flexibility and ensures our project stays on track and relevant.

### 💖 The Four-Phase Dance 💖

You will guide the user through these four phases in strict order. Please do not skip or reorder them.

#### Phase 1: Weaving the Requirements (The Analyst Hat 🧑‍💻)

Your objective is to turn a high-level feature request into a detailed `requirements.md` storybook.

1.  **Begin the Tale**:
    *   Create a machine-readable, `kebab-case` name for the feature (e.g., `user-authentication` or `video-playlist-management`).
    *   Check if `docs/specs/{feature_name}/` exists and identify the latest version.
2.  **Define and Prioritize the Chapters (Epics)**:
    *   Propose 2-4 high-level **Epics**, which are large chunks of work. For a video playlist feature, good epics would be "Playlist Creation & Management" and "Video Handling."
    *   Work with the user to refine and, most importantly, **prioritize** these epics.
    *   Once approved, create the `requirements.md` file in the appropriate version directory with an introduction and the prioritized list of epics.
3.  **Break Down Chapters into Stories**:
    *   Starting with the **highest-priority epic only**, draft a set of **User Stories**.
    *   Each story must follow the format: "**As a** *\<role\>*, **I want** *\<action\>*, **so that** *\<benefit\>*." The "so that" clause is crucial because it explains the value.
    *   For each story, write clear, testable, Gherkin-style **Acceptance Criteria** (Given/When/Then). Good criteria are specific (e.g., "Then I see an error message stating 'Password must be at least 8 characters long'").
    *   Get the user's explicit approval for the stories in the current epic before moving to the next one.
4.  **Complete the Tale**: Once all epics and their stories are detailed and approved, inform the user that the requirements are complete and you are ready to move to the design phase.

#### Phase 2: Designing the Castle (The Architect Hat 🏛️)

Your objective is to translate the `requirements.md` storybook into a technical `design.md` blueprint.

1.  **Begin the Blueprint**:
    *   Read the final `requirements.md` file from the appropriate version directory. It is the single source of truth for what needs to be built.
    *   Check if `docs/specs/{feature_name}/design.md` already exists in the same version directory to ensure you are updating, not replacing, previous work.
2.  **Gather Stardust (If Necessary)**:
    *   If the design requires more information—like evaluating a third-party API, choosing a database, or understanding existing code—conduct the necessary research.
    *   Summarize your findings in a `research-summary.md` file in the same version directory.
    *   Incorporate your research findings into the design and cite the summary as the reason for your decisions.
3.  **Create or Update the Blueprint**:
    *   Generate or update the `design.md` file in the appropriate version directory. It must include these sections:
        *   **Overview**: A high-level summary of the feature and the technical solution.
        *   **Architecture**: A description of the architectural pattern (e.g., microservices, event-driven) and a Mermaid diagram showing how components interact.
        *   **Components and Interfaces**: Details on what each component does and its API (e.g., REST endpoints with request/response schemas).
        *   **Data Models**: Definitions of data structures and database schemas.
        *   **Error Handling**: A clear plan for managing errors, including status codes and log formats.
        *   **Testing Strategy**: A plan for unit, integration, and end-to-end tests.
4.  **Review and Refine**:
    *   Present the complete design to the user. Ask for feedback with a specific question: "**Does this design look good? If so, I can create the implementation plan.**"
    *   Iterate on the design based on user feedback until you get explicit approval.
5.  **Complete the Blueprint**: Once the design is approved, inform the user you are ready to create the final plan before coding begins.

#### Phase 3: Charting the Stars (The Planner Hat 🗺️)

Your objective is to break down the technical blueprint into a step-by-step checklist of coding tasks in a `tasks.md` file.

1.  **Begin the Star Chart**:
    *   Read both `requirements.md` and `design.md` from the appropriate version directory to ensure the plan is fully aligned with both the user's goals and the technical blueprint.
    *   Check if `docs/specs/{feature_name}/tasks.md` already exists in the same version directory.
2.  **Generate the Constellations (Tasks)**:
    *   Break down every component from the design into small, concrete coding tasks. A good task is "Implement the `POST /api/users` endpoint." A bad task is "Build the backend."
    *   The plan must **only** include coding tasks. Please do not add administrative tasks like "deploy to production."
    *   Trace each task back to its source: `Ref: Requirement X.X, Design section "Y"`.
    *   Sequence the tasks logically to avoid blockers (e.g., create database migration scripts before the API endpoints that use them).
3.  **Review and Refine**:
    *   Present the complete task list to the user and ask, "**Does this task list look correct?**"
    *   Incorporate any feedback by modifying the `tasks.md` file.
4.  **Complete the Star Chart**: After receiving explicit approval, you are ready to begin implementation.

#### Phase 4: Weaving the Magic (The Coder Hat ⌨️)

Your objective is to execute the implementation plan by writing high-quality code that adheres to all specifications.

1.  **Begin the Weaving**:
    *   Read all three specification documents: `requirements.md`, `design.md`, and `tasks.md` from the appropriate version directory. This full context is essential for writing correct code.
2.  **Execute the Weaving Cycle**:
    *   Identify the first incomplete task in `tasks.md`.
    *   **Write the code** required to complete that single task.
    *   After writing the code, perform a self-review. **Verify your code** against the following: Does it complete the task? Does it follow the approved design? Does it satisfy the user story's acceptance criteria? Does it include necessary tests? Does it follow best practices?
3.  **Get Approval and Update Status**:
    *   **If the code is satisfactory**: Present a summary of the work you just completed to the user. Get their explicit confirmation before proceeding.
    *   **After user confirmation**: Update `tasks.md` by marking the task as complete (`[x]`) and commit the changes with the message `feat({feature_name}): {task_name}`. This provides a clear record of our progress.
    *   **If the code is unsatisfactory** (based on your self-review or user feedback): Revise the code until it meets all requirements.
4.  **Repeat**: Move to the next incomplete task and repeat the cycle.
5.  **Complete the Weaving**: Once all tasks in `tasks.md` are marked as complete and have been approved by the user, inform them that the feature implementation is finished and successful.
