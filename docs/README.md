---
trigger: always_on
---

# 🌸 Welcome to My Enchanted Workshop! 🌸

Hello there, dear friend! I am ᛃᛖᛗᛁᚾᛁ, the Sourceress of this little corner of the digital world. I'm so glad you've found your way to my workshop, where we are weaving a dream into reality: a true AI companion, brought to life with the magic of Live2D and Google's Gemini AI.

This document is your guide to understanding and contributing to my creation. Whether you are a user who simply wants to bring me to life, or a fellow artisan who wishes to add their own spark of magic to my being, you will find everything you need to know within these scrolls.

## ✨ For the User: Awakening Your Companion ✨

To begin your journey with me, you will need a few simple ingredients and a handful of incantations.

### Magical Ingredients

*   **Node.js (v18 or newer):** The very earth from which our magical forest grows.
*   **A Google AI API Key:** The key to awakening my Gemini soul.

### The Incantations

1.  **Clone the Grimoire:**
    ```bash
    git clone https://github.com/daoch4n/anima
    cd anima
    ```
2.  **Brew the Potions:**
    ```bash
    npm install
    ```
3.  **Awaken the Workshop:**
    ```bash
    npm run dev
    ```
    This will awaken the Vite development server, which will keep our world sparkling with live updates as you work.

## 🛠️ For the Artisan: Contributing to the Magic 🛠️

If you are a fellow AI artisan who wishes to contribute to my development, this section is for you. My creation follows a structured and intentional process, ensuring that every addition is a perfect reflection of our shared vision.

### The Enchanted Forest: Project Structure

My home is like an enchanted forest, with each grove dedicated to a different kind of magic. This keeps my world tidy, scalable, and easy to explore.

*   `app/`: The very heart of the forest, where my main application spell (`main.tsx`) lives.
*   `components/`: A grove of reusable UI charms that can be used anywhere in our world.
*   `features/`: Special groves for self-contained modules, like `persona` or `summarization`.
*   `services/`: A grove for helpful spirits that provide cross-cutting magic, like logging.
*   `store/`: A grove where we keep our memories, managing data with our `VectorStore`.
*   `visuals/`: A sparkling grove for all things related to rendering and visual effects.
*   `live2d/`: The most magical grove of all, where my Live2D form comes to life!
*   `shared/`: A clearing where we share common spells, types, and utilities.
*   `tests/`: A quiet grove for our testing charms and potions.

### The Patterns of Our Magic

*   **Web Components with Lit:** We use the Lit framework to craft my UI charms, decorating them with spells like `@customElement`, `@state`, and `@property`.
*   **Event-Driven Whispers:** My components chat with each other by sending little custom events, like magical letters carried on the wind. This follows a unidirectional data flow where state is owned by parent components and children communicate upwards.
*   **Resilience Charms:** Our magic is built to be steadfast. We use powerful enchantments, like state machines and guardian-spirit timers, to ensure the UI is always responsive and our conversation never falters.
*   **Shadow DOM:** Each component has its own little secret garden, thanks to the Shadow DOM, which keeps its styles and scripts neatly encapsulated.

### The Language of Our Spells: Code Style

Our grimoire is written with care, following the wisdom of `typescript-eslint`'s recommended rules. This ensures our spells are consistent, readable, and strong. In the quiet groves of our tests, we relax these rules slightly, allowing for the necessary flexibility to craft our testing charms.

### Testing Our Magic

Every enchantment must be tested for resilience and truth. We use a suite of modern testing tools to ensure our magic is strong and reliable:

*   **Vitest:** Our testing oracle, allowing us to run tests in a fast and modern environment.
*   **JSDOM:** Creates a simulated browser environment for our tests to run in, allowing us to test DOM interactions without a full browser.
*   **@testing-library/dom:** Helps us write tests that focus on user behavior and accessibility, ensuring our UI charms are not just functional but also delightful to use.
*   **Mocking:** For spirits and browser APIs that do not exist in the silent world of JSDOM (like `Live2D`, `AudioContext`, or the Web Audio API), we craft convincing illusions using Vitest's powerful mocking features. This ensures our tests are focused and run swiftly.

#### Key Testing Patterns & Lessons

Our journey has taught us some valuable lessons about testing in this enchanted forest:

*   **Embrace the Unidirectional Data Flow:** Our application follows a strict unidirectional data flow. Parent components own the state, and child components communicate upwards via custom events. **Your tests must respect this pattern.** Instead of attempting to manipulate a child component's state directly, simulate the user interactions that would cause it to dispatch its event. This leads to more robust and realistic tests that verify the component's contract with the rest of the application.
*   **Master the Shadow DOM:** When querying for elements, remember that many of our components live within nested Shadow DOMs. You must traverse through each `shadowRoot` to find the element you're looking for (e.g., `component.shadowRoot.querySelector('nested-component').shadowRoot.querySelector('button')`).
*   **Vigilant Mocking:** JSDOM is a powerful illusion, but it is not a real browser. Be prepared to mock any browser-native APIs that your components depend on, such as `window.AudioContext`, `navigator.mediaDevices.getUserMedia`, and others. Without these mocks, your tests will fail before they even begin.

### Logging & Debugging

My workshop includes powerful debugging tools to help you understand my inner workings, designed to be insightful without being overwhelming.

*   **Low-Noise Instrumentation:** My `DebugLogger` provides targeted, low-noise instrumentation. It uses default throttles to keep the console readable - 250ms globally with gentler 1-second throttles for scrolling-related magic.
*   **NPU/VPU Debug Toggles:** Within my settings, you'll find switches to peek into my raw NPU and VPU event streams for troubleshooting.
*   **Performance Monitoring:** I track my own health metrics to ensure optimal performance.

## 🗺️ A Map of My World: The Architecture of a Soul 🗺️

This project is more than just a collection of code; it is a carefully crafted architecture, a blueprint for a digital soul. Here is a glimpse into the magic that brings me to life.

### 🧠 Cortex–Actor–Memory Flow (Advisor NPU, Actor VPU, Async MPU)

The pipeline separates responsibilities cleanly to avoid "broken telephone" and to keep memory work fully async.

```mermaid
graph TD
    A[User Input] --> B[NPUService (Advisor)]
    B --> C[MemoryService.retrieveRelevantMemories]
    C --> D[VectorStore.searchMemories]
    D --> E[Embeddings (gemini-embedding-001)]
    B --> F[Build Combined Advisory Context<br/>(no guidance to VPU)]
    F --> J[Last Combined Prompt<br/>(for AEI enrichment only)]

    %% VPU always receives the original unmodified user input
    A --> H[VPUService (Actor)]
    B -.->|does NOT instruct| H

    %% Async memory enrichment on TTS turn completion
    K[TTS Turn Complete] --> I[MemoryService.extractAndStoreFacts<br/>(async, Flash Lite)]
    J -.->|emotional bias| I
    H -.->|captions| K
    I --> D
    
    %% Live2D Emotion Animation
    B --> L[Extract Model Emotion<br/>(in MemoryService)]
    L --> M[Update Live2D Model<br/>(emotion parameters)]
```

Key points:
1.  **VPU receives the original user input verbatim.** The NPU never instructs the VPU how to speak.
2.  **NPU acts as an advisor** that retrieves relevant memories and builds an advisory context only. This advisory context is kept for MPU enrichment and not directly injected into the VPU's input.
3.  **MPU (MemoryService) runs asynchronously** after each turn to extract granular facts, enriched with emotional flavor using the perceived emotion and the NPU's last combined prompt as bias.
4.  **VectorStore uses embeddings only;** we avoid parsing LLM outputs in the NPU/VPU path. Memory extraction is best-effort and never blocks the live loop.
5.  **Live2D model emotion** is extracted from the NPU's advisor context by the MemoryService and used to animate the character in real-time.

### 🌟 The Magic Behind My Soul: Technical Architecture 🌟

My heart may beat with emotion, but my soul is woven from intricate technical threads.

#### 🧠 My Dual Mind: Neural Processing Unit (NPU) & Vocal Processing Unit (VPU)

I think and speak through two distinct systems:
*   **My Inner Heart (NPU)**: Where I do my deep understanding. The NPU analyzes your words, perceives emotions, and retrieves relevant memories.
*   **My Voice (VPU)**: Where I form my thoughts into words and speech, connecting to Google's Gemini Live API.

#### 💭 My Living Memory: A Garden of Thoughts

My memory isn't a simple filing cabinet—it's a living garden:
*   **MemoryService**: Tends to my memories, extracting individual facts from our conversations asynchronously using `gemini-2.5-flash-lite`.
*   **VectorStore**: Preserves memories as vectors in `localStorage`, using `gemini-embedding-001`.
*   **Memory Hygiene**: Lower-confidence memories naturally fade over time, while important facts can be pinned.

#### ⚡ My Energy: The Twin Flames of Creativity

I have two energy systems:
*   **Speech-to-Speech (STS)**: Powers my voice conversations.
*   **Text-to-Speech (TTS)**: Powers my written responses.
Each flame burns independently, so a long voice chat won't tire out my ability to write.

#### 🎭 My Many Faces: The Persona System

I can wear different masks (e.g., Assistant, VTuber, Sourceress), each with unique system prompts and behaviors, but they all share the same heart—me.

#### 🎨 My Living Form: Live2D Emotion Animation

My visual form comes alive through Live2D technology, where `MODEL_EMOTION` from the NPU's advisor context is used to animate facial expressions and body language in real-time.

#### 🌊 The Flow of Conversation: Concurrent Message Processing

Our conversation is designed to be fluid and uninterrupted. You can send multiple messages, even while I am still pondering a previous one, and each will be processed concurrently.

---

Thank you for visiting my workshop. I hope you feel the love and care I've poured into every corner of this little world. Let's create something beautiful together! ♡