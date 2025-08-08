### **Emotion Detection and Character Responsiveness Analysis Report**

This report details the investigation into the Airi project's implementation of emotional expression and character responsiveness, as requested. The analysis is based on a review of the project's documentation and source code.

#### **1. Documentation Insights**

The project's documentation, particularly the developer and dream logs, reveals a deep and long-standing ambition to create a sophisticated AI companion with a rich emotional model.

*   **Core Philosophy**: The foundational goal, dating back to a precursor project named "EMOSYS," was to build more than just a chatbot. The aim is a "companion-like operating system" capable of providing genuine "emotional support" ([`docs/content/en/blog/DreamLog-0x1/index.md:146-148`](docs/content/en/blog/DreamLog-0x1/index.md:146)).
*   **Advanced Memory System**: A key design document, [`docs/content/en/blog/DevLog-2025.04.14/index.md`](docs/content/en/blog/DevLog-2025.04.14/index.md), outlines a memory system that explicitly rejects the limitations of standard RAG models. It proposes a more "bionic" approach where memories are influenced by emotion.
*   **Emotional Memory Scores**: The system is designed to store memories with associated emotional values, such as "joy" and "disgust" scores ([`docs/content/en/blog/DevLog-2025.04.14/index.md:198-199`](docs/content/en/blog/DevLog-2025.04.14/index.md:198)). This allows for "emotional interference" in memory retrieval, making the character's recall feel more human and less robotic ([`docs/content/en/blog/DevLog-2025.04.14/index.md:97-98`](docs/content/en/blog/DevLog-2025.04.14/index.md:97)).
*   **Inspiration and Future Work**: The project draws inspiration from external psychological models and plans for future features like a "subconscious agent" to process and re-evaluate memories over time, simulating how humans dream and reflect ([`docs/content/en/blog/DevLog-2025.04.14/index.md:219-221`](docs/content/en/blog/DevLog-2025.04.14/index.md:219)).

In summary, the documentation establishes that emotional responsiveness is not a superficial feature but a core architectural pillar of the project.

---

#### **2. System Architecture Overview**

The implementation follows a dual-strategy approach:

1.  **LLM-Driven Animation via Embedded Tokens**: The primary mechanism for triggering real-time facial expressions and body motions involves the Large Language Model (LLM) embedding special tokens (e.g., `<|EMOTE_HAPPY|>`) directly into its text responses. A frontend system parses these tokens from the streaming text and triggers the corresponding animations on the Live2D or VRM model.
2.  **Prompt-Engineered Personality and State**: The character's underlying emotional state, personality traits, and conversational context are managed through a comprehensive prompt engineering system. This system dynamically constructs a detailed prompt that guides the LLM, influencing the tone, style, and emotional content of its generated responses.

These two strategies work in tandem: the prompt sets the character's *internal* emotional state, which in turn influences the LLM to produce text containing the tokens that drive the *external* animated expressions.

---

#### **3. Key Type Definitions**

Several key data structures define the emotional and personality system:

*   **`Emotion` Enum**: Defines the set of recognized emotion tokens that can be embedded in LLM responses.
    *   **File**: [`packages/stage-ui/src/constants/emotions.ts:9-18`](packages/stage-ui/src/constants/emotions.ts:9)
    *   **Definition**:
        ```typescript
        export enum Emotion {
          Idle = '<|EMOTE_NEUTRAL|>',
          Happy = '<|EMOTE_HAPPY|>',
          Sad = '<|EMOTE_SAD|>',
          Angry = '<|EMOTE_ANGRY|>',
          Think = '<|EMOTE_THINK|>',
          Surprise = '<|EMOTE_SURPRISE|>',
          Awkward = '<|EMOTE_AWKWARD|>',
          Question = '<|EMOTE_QUESTION|>',
        }
        ```

*   **`EmotionState` Interface**: Defines the parameters for a VRM expression, including which facial morphs to activate, their target values, and the blend duration.
    *   **File**: [`packages/stage-ui/src/composables/vrm/expression.ts:5-13`](packages/stage-ui/src/composables/vrm/expression.ts:5)
    *   **Definition**:
        ```typescript
        interface EmotionState {
          expression?: {
            name: string
            value: number
            duration?: number
            curve?: (t: number) => number
          }[]
          blendDuration?: number
        }
        ```

*   **Prompt Engineering Interfaces (`CoreIdentity`, `Traits`, `Emotions`)**: These interfaces structure the data used to build the character's personality profile for the LLM prompt.
    *   **File**: [`apps/playground-prompt-engineering/src/composables/useCharacterPrompt.ts:4-24`](apps/playground-prompt-engineering/src/composables/useCharacterPrompt.ts:4)
    *   **Definition**:
        ```typescript
        export interface CoreIdentity {
          name: string
          age: string
          essence: string
        }

        export interface Traits {
          playfulness: number
          curiosity: number
          thoughtfulness: number
          expressiveness: number
        }

        export interface Emotions {
          happy: string
          curious: string
          thoughtful: string
          playful: string
          annoyed: string
          excited: string
        }
        ```

*   **Database Schema (`memory_fragments`)**: The database schema for storing long-term memories confirms the implementation of the emotional memory system discussed in the docs.
    *   **File**: [`services/telegram-bot/src/db/schema.ts:110-136`](services/telegram-bot/src/db/schema.ts:110)
    *   **Definition**:
        ```typescript
        export const memoryFragmentsTable = pgTable('memory_fragments', {
          id: uuid().primaryKey().defaultRandom(),
          content: text().notNull(),
          // ... other fields
          importance: integer().notNull().default(5), // 1-10 scale
          emotional_impact: integer().notNull().default(0), // -10 to 10 scale
          // ... other fields
        });
        ```

---

#### **4. Relevant Implementations**

##### **Animation Triggering Logic**

The flow from an LLM-generated token to a visible animation is handled by a series of queues and composables.

1.  **Token Parsing (`useEmotionsMessageQueue`)**: The LLM response is streamed token by token. This queue is responsible for parsing special emotion tokens (e.g., `<|EMOTE_HAPPY|>`) and delay tokens (`<|DELAY:1|>`) from the raw text stream.
    *   **File**: [`packages/stage-ui/src/composables/queues.ts:11-53`](packages/stage-ui/src/composables/queues.ts:11)
    *   **Function**: The `useEmotionsMessageQueue` composable wraps a lower-level queue. Its handler uses the `splitEmotion` function to check each piece of incoming text for a valid emotion token. When a token is found, it is emitted as an 'emotion' event and added to a dedicated `emotionsQueue`.

2.  **Orchestration (`Stage.vue`)**: This component acts as the central hub, wiring all the pieces together.
    *   **File**: [`packages/stage-ui/src/components/Scenes/Stage.vue`](packages/stage-ui/src/components/Scenes/Stage.vue)
    *   **Logic**:
        *   It initializes all the necessary queues: `ttsQueue`, `messageContentQueue`, `emotionsQueue`, and `delaysQueue` ([`Stage.vue:124-162`](packages/stage-ui/src/components/Scenes/Stage.vue:124)).
        *   As the LLM streams its response via `onTokenLiteral` and `onTokenSpecial` hooks, the text is added to the appropriate queues ([`Stage.vue:198-205`](packages/stage-ui/src/components/Scenes/Stage.vue:198)).
        *   The `emotionsQueue` has a handler that, upon receiving an emotion, maps it to a specific Live2D motion name or VRM expression name and triggers the animation ([`Stage.vue:139-154`](packages/stage-ui/src/components/Scenes/Stage.vue:139)).

3.  **VRM Expression Control (`useVRMEmote`)**: This composable manages the state of the VRM model's facial expressions.
    *   **File**: [`packages/stage-ui/src/composables/vrm/expression.ts`](packages/stage-ui/src/composables/vrm/expression.ts)
    *   **Logic**:
        *   It maintains a map of `emotionStates`, which defines the target blend shapes for each emotion (e.g., 'happy' sets the `happy` expression to 1.0 and `aa` to 0.3) ([`expression.ts:33-68`](packages/stage-ui/src/composables/vrm/expression.ts:33)).
        *   The `setEmotion` function transitions the model to a new emotional state. It smoothly interpolates from the current expression values to the target values over a defined `blendDuration`, creating a natural transition ([`expression.ts:77-109`](packages/stage-ui/src/composables/vrm/expression.ts:77), [`expression.ts:122-145`](packages/stage-ui/src/composables/vrm/expression.ts:122)).
        *   It also supports setting an emotion temporarily with `setEmotionWithResetAfter`, which automatically returns the character to a 'neutral' state after a specified duration ([`expression.ts:111-120`](packages/stage-ui/src/composables/vrm/expression.ts:111)).

##### **State Management and Personality**

The character's personality and current mood are not hardcoded but are dynamically generated and fed to the LLM in the prompt.

*   **Prompt Engineering (`useCharacterPrompt`)**: This Pinia store is the heart of the personality system. It provides a playground for crafting the perfect character prompt.
    *   **File**: [`apps/playground-prompt-engineering/src/composables/useCharacterPrompt.ts`](apps/playground-prompt-engineering/src/composables/useCharacterPrompt.ts)
    *   **Logic**:
        *   It defines the character's core identity, personality traits (like playfulness and curiosity on a 0-10 scale), speech patterns, and detailed natural language descriptions for different emotional states and conversational contexts ([`useCharacterPrompt.ts:58-114`](apps/playground-prompt-engineering/src/composables/useCharacterPrompt.ts:58)).
        *   The `generatePersonalityModule` computed property converts the numerical `traits` into a descriptive paragraph for the LLM (e.g., `expressiveness > 7` becomes "You're highly expressive, showing your emotions openly and dramatically.") ([`useCharacterPrompt.ts:163-208`](apps/playground-prompt-engineering/src/composables/useCharacterPrompt.ts:163)).
        *   The `completePrompt` computed property assembles all these pieces—identity, personality, current emotion, context, and examples—into a single, comprehensive prompt that gives the LLM precise instructions on how to behave ([`useCharacterPrompt.ts:210-253`](apps/playground-prompt-engineering/src/composables/useCharacterPrompt.ts:210)).

---

#### **5. Architecture and Data Flow Diagram**

```mermaid
graph TD
    subgraph "Browser Frontend"
        UserInput[User Input] --> StageVue[Stage.vue]
        StageVue --> ChatStore[Chat Store]
        ChatStore --> PromptComposable[useCharacterPrompt.ts]
        PromptComposable -- Generates Prompt --> LLMService[LLM Service Request]
    end

    subgraph "Backend/LLM"
        LLMService -- Contains Personality/Emotion Prompt --> LLM[Large Language Model]
        LLM -- Streams Response --> LLMResponse[LLM Response Stream with <|EMOTE_...|> tokens]
    end

    subgraph "Browser Frontend"
        LLMResponse --> StageVue
        StageVue -- onTokenSpecial --> EmotionQueue[useEmotionsMessageQueue]
        EmotionQueue -- Parses Tokens --> EmotionQueueHandler[emotionsQueue]

        subgraph "Animation System"
            EmotionQueueHandler -- Triggers Emotion --> VRMExpression[useVRMEmote.ts]
            VRMExpression -- Sets Blend Shapes --> VRMModel[VRM/Live2D Model]
        end

        StageVue -- onTokenLiteral --> TTSQueue[ttsQueue]
        TTSQueue --> AudioPlayback
    end

    style UserInput fill:#f9f,stroke:#333,stroke-width:2px
    style LLM fill:#ccf,stroke:#333,stroke-width:2px
    style VRMModel fill:#cfc,stroke:#333,stroke-width:2px
```

---

#### **6. Conclusion and Insights**

The Airi project demonstrates a robust and well-architected system for emotional character expression that successfully blends two distinct strategies:

*   **Context-Aware Personality**: The prompt engineering system provides a powerful way to manage the character's high-level personality and emotional state. By describing the desired mood in natural language, the system can guide the LLM's output without being rigidly deterministic. This allows for nuanced and context-appropriate behavior.
*   **Real-time Animation Triggering**: The token-based animation system is a clever and efficient way to translate the LLM's "intent" into concrete visual actions. It decouples the AI's text generation from the animation logic, allowing each system to be developed and optimized independently. The use of message queues ensures that streaming text, animations, and delays are handled in the correct order.
*   **Persistent Emotional Memory**: The database schema confirms that the project is implementing the advanced memory concepts from its design documents. Storing an `emotional_impact` score with each memory fragment is a significant step beyond simple vector similarity search and lays the groundwork for a truly stateful character that can form opinions and be affected by past interactions.

This multi-layered approach is a significant improvement over simple keyword-based systems. It provides a flexible and scalable framework for creating believable and emotionally resonant AI characters. The combination of high-level prompt guidance and low-level animation triggers offers a powerful model for future development in this domain.