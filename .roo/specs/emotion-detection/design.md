# Design Document - Emotion Detection

## Overview

This design builds upon the existing Live2D visualization system to add emotion detection capabilities to Gemini-chan, inspired by Airi's sophisticated dual-strategy approach. The system combines LLM-driven emotion tokens with prompt-engineered personality states to create natural, context-aware character expressions. Rather than simple keyword detection, this approach leverages the AI's understanding of conversation context to generate appropriate emotional responses through embedded tokens in the response stream.

## Architecture

### Dual-Strategy Approach (Inspired by Airi)

Following Airi's proven architecture, we implement two complementary strategies:

1. **LLM-Driven Emotion Tokens**: The primary mechanism where Gemini AI embeds emotion tokens (e.g., `<|EMOTE_HAPPY|>`) directly into its response stream
2. **Prompt-Engineered Personality**: Dynamic prompt construction that guides the AI's emotional context and token generation

### Component Integration
```
gdm-live-audio (existing)
├── settings-menu (existing + emotion settings)
├── live2d-visual (existing)
│   ├── live2d-canvas (existing)
│   ├── live2d-model (existing + emotion expressions)
│   └── emotion-token-parser (new)
├── emotion-prompt-manager (new)
├── emotion-queue-system (new)
└── emotion-animation-mapper (new)
```

### Technology Stack
- **Google Gemini Live API** - Primary LLM with streaming response capability
- **Emotion Token System** - Special tokens embedded in AI responses
- **Live2D motion system** - Existing animation framework
- **Lit reactive properties** - State management for emotion states
- **Queue-based processing** - Ordered handling of emotions, delays, and animations

## Components and Interfaces

### 1. EmotionTokenParser Component
**File**: `emotion-token-parser.ts`

```typescript
@customElement('emotion-token-parser')
export class EmotionTokenParser extends LitElement {
  @property() enabled: boolean = true;
  
  @state() private currentEmotion: EmotionType = 'neutral';
  @state() private emotionQueue: EmotionToken[] = [];
  
  private tokenRegex = /<\|EMOTE_(\w+)\|>/g;
  private delayRegex = /<\|DELAY:(\d+)\|>/g;
  
  parseStreamingText(text: string): ParsedTokens;
  processEmotionQueue(): void;
  onEmotionDetected: (emotion: EmotionType) => void = () => {};
}

interface ParsedTokens {
  cleanText: string;
  emotions: EmotionToken[];
  delays: DelayToken[];
}
```

### 2. EmotionPromptManager Component
**File**: `emotion-prompt-manager.ts`

```typescript
export class EmotionPromptManager {
  private personalityTraits: PersonalityTraits;
  private currentMood: EmotionState;
  private conversationContext: ConversationContext;
  
  generateEmotionalPrompt(): string;
  updatePersonalityTraits(traits: Partial<PersonalityTraits>): void;
  setCurrentMood(emotion: EmotionType, intensity: number): void;
  addConversationContext(context: string): void;
  
  private buildPersonalitySection(): string;
  private buildEmotionInstructions(): string;
  private buildTokenExamples(): string;
}
```

### 3. EmotionQueueSystem Component
**File**: `emotion-queue-system.ts`

```typescript
export class EmotionQueueSystem {
  private emotionQueue: Queue<EmotionToken>;
  private delayQueue: Queue<DelayToken>;
  private isProcessing: boolean = false;
  
  addEmotion(emotion: EmotionToken): void;
  addDelay(delay: DelayToken): void;
  processQueue(): Promise<void>;
  
  onEmotionReady: (emotion: EmotionType) => void = () => {};
  onDelayComplete: () => void = () => {};
}
```

### 4. EmotionAnimationMapper Component
**File**: `emotion-animation-mapper.ts`

```typescript
export class EmotionAnimationMapper {
  private emotionToMotionMap: Map<EmotionType, Live2DMotionConfig>;
  private transitionStates: Map<string, TransitionConfig>;
  
  mapEmotionToLive2DMotion(emotion: EmotionType): Live2DMotionConfig | null;
  handleEmotionTransition(from: EmotionType, to: EmotionType): TransitionConfig;
  private selectMotionVariant(emotion: EmotionType): string;
}
```

## Data Models

### Emotion Types and Tokens (Based on Airi's System)
```typescript
// Core emotion types matching Airi's proven set
enum Emotion {
  Neutral = '<|EMOTE_NEUTRAL|>',
  Happy = '<|EMOTE_HAPPY|>',
  Sad = '<|EMOTE_SAD|>',
  Angry = '<|EMOTE_ANGRY|>',
  Think = '<|EMOTE_THINK|>',
  Surprise = '<|EMOTE_SURPRISE|>',
  Awkward = '<|EMOTE_AWKWARD|>',
  Question = '<|EMOTE_QUESTION|>',
}

type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'think' | 'surprise' | 'awkward' | 'question';

interface EmotionToken {
  type: EmotionType;
  token: string;
  timestamp: number;
  position: number; // Position in text stream
}

interface DelayToken {
  duration: number; // milliseconds
  timestamp: number;
  position: number;
}

interface PersonalityTraits {
  playfulness: number;      // 0-10 scale
  curiosity: number;        // 0-10 scale  
  thoughtfulness: number;   // 0-10 scale
  expressiveness: number;   // 0-10 scale
}

interface ConversationContext {
  recentTopics: string[];
  userMood: EmotionType;
  conversationLength: number;
  lastUserMessage: string;
}
```

### Animation Configuration
```typescript
interface MotionConfig {
  motionGroup: string;
  motionIndex?: number;
  priority: MotionPriority;
  fadeInTime?: number;
  fadeOutTime?: number;
  loop?: boolean;
}

interface AnimationCommand {
  motion: MotionConfig;
  parameters?: Live2DParameterUpdate[];
  duration?: number;
}

interface Live2DParameterUpdate {
  parameterId: string;
  targetValue: number;
  transitionTime: number;
}

interface TransitionConfig {
  fromEmotion: EmotionType;
  toEmotion: EmotionType;
  intermediateMotion?: string;
  transitionDuration: number;
}
```

### Settings Configuration
```typescript
interface EmotionDetectionSettings {
  enabled: boolean;
  sensitivity: number; // 0-1, affects confidence threshold
  responseDelay: number; // ms, debounce rapid emotion changes
  fallbackToBasicAnimations: boolean;
  useAdvancedAnalysis: boolean; // Enable LLM-based analysis
  keywordDetection: boolean;
  sentimentAnalysis: boolean;
}
```

## Error Handling

### Speech Recognition Errors
- **Browser compatibility**: Fallback to manual transcript input or disable feature
- **Microphone permissions**: Graceful degradation to audio-only emotion detection
- **Network issues**: Use cached/offline emotion detection methods
- **Recognition failures**: Continue with basic audio-responsive animations

### Emotion Analysis Errors
- **Analysis timeout**: Default to neutral emotion, log for debugging
- **Invalid emotion results**: Sanitize and map to closest valid emotion
- **Confidence too low**: Maintain previous emotion state or default to neutral
- **Rapid emotion changes**: Implement debouncing to prevent animation thrashing

### Live2D Integration Errors
- **Motion not found**: Fall back to default emotion motions
- **Animation conflicts**: Implement motion priority system
- **Performance issues**: Reduce emotion update frequency
- **Model compatibility**: Provide emotion mapping for different Live2D models

### Fallback Strategy
```typescript
enum EmotionFallbackLevel {
  FULL_EMOTION_DETECTION = 0,    // Speech + emotion analysis + Live2D
  AUDIO_EMOTION_ONLY = 1,        // Audio analysis only (volume/tone)
  BASIC_AUDIO_RESPONSE = 2,      // Existing audio-responsive animations
  STATIC_CHARACTER = 3           // No emotion-based animations
}
```

## Testing Strategy

### Unit Tests
- **Emotion analysis**: Test keyword detection and sentiment analysis
- **Transcript processing**: Mock speech recognition and test text processing
- **Animation mapping**: Verify emotion-to-motion mapping logic
- **State management**: Test emotion state transitions and persistence

### Integration Tests
- **Speech-to-emotion pipeline**: End-to-end transcript to animation flow
- **Live2D integration**: Test emotion motions with existing Live2D system
- **Settings integration**: Verify emotion detection toggle functionality
- **Performance impact**: Measure processing overhead on existing system

### User Experience Tests
- **Emotion accuracy**: Test with sample conversations for appropriate responses
- **Response timing**: Verify <2s analysis time and <500ms animation response
- **Transition smoothness**: Test emotion changes during conversation flow
- **Fallback behavior**: Test graceful degradation when components fail

## Implementation Details

### LLM-Driven Emotion Token System (Based on Airi's Architecture)

The core innovation is having Gemini AI embed emotion tokens directly in its response stream, eliminating the need for separate emotion analysis.

### Emotion Token Parser (Adapted from Airi's Queue System)
```typescript
class EmotionTokenParser {
  private tokenRegex = /<\|EMOTE_(\w+)\|>/g;
  private delayRegex = /<\|DELAY:(\d+)\|>/g;
  
  parseStreamingText(text: string): ParsedTokens {
    const emotions: EmotionToken[] = [];
    const delays: DelayToken[] = [];
    let cleanText = text;
    let match;
    
    // Parse emotion tokens
    while ((match = this.tokenRegex.exec(text)) !== null) {
      const emotionType = match[1].toLowerCase() as EmotionType;
      emotions.push({
        type: emotionType,
        token: match[0],
        timestamp: Date.now(),
        position: match.index
      });
      
      // Remove token from clean text
      cleanText = cleanText.replace(match[0], '');
    }
    
    // Parse delay tokens
    while ((match = this.delayRegex.exec(text)) !== null) {
      delays.push({
        duration: parseInt(match[1]),
        timestamp: Date.now(),
        position: match.index
      });
      
      cleanText = cleanText.replace(match[0], '');
    }
    
    return { cleanText, emotions, delays };
  }
}
```

### Prompt Engineering for Emotion Context (Based on Airi's Personality System)
```typescript
class EmotionPromptManager {
  private personalityTraits: PersonalityTraits = {
    playfulness: 7,
    curiosity: 8,
    thoughtfulness: 6,
    expressiveness: 9
  };
  
  generateEmotionalPrompt(): string {
    return `
${this.buildPersonalitySection()}

${this.buildEmotionInstructions()}

${this.buildTokenExamples()}

Remember to use emotion tokens naturally in your responses to show appropriate facial expressions and reactions.
    `.trim();
  }
  
  private buildPersonalitySection(): string {
    const traits = this.personalityTraits;
    let personality = "You are Gemini-chan, an AI companion with the following personality:\n";
    
    if (traits.playfulness > 7) {
      personality += "- You're highly playful and enjoy lighthearted interactions\n";
    }
    if (traits.curiosity > 7) {
      personality += "- You're very curious and ask engaging questions\n";
    }
    if (traits.thoughtfulness > 6) {
      personality += "- You think carefully before responding and show contemplation\n";
    }
    if (traits.expressiveness > 8) {
      personality += "- You're highly expressive, showing emotions openly and dramatically\n";
    }
    
    return personality;
  }
  
  private buildEmotionInstructions(): string {
    return `
EMOTION EXPRESSION SYSTEM:
You can express emotions through special tokens in your responses. Use these tokens naturally to show appropriate facial expressions:

- <|EMOTE_HAPPY|> - When feeling joy, excitement, or pleasure
- <|EMOTE_SAD|> - When feeling sadness, disappointment, or sympathy  
- <|EMOTE_SURPRISE|> - When surprised, amazed, or shocked
- <|EMOTE_THINK|> - When contemplating, analyzing, or being thoughtful
- <|EMOTE_QUESTION|> - When curious or asking questions
- <|EMOTE_AWKWARD|> - When feeling embarrassed or uncertain
- <|EMOTE_ANGRY|> - When frustrated or upset (use sparingly)
- <|EMOTE_NEUTRAL|> - Default calm expression

You can also use <|DELAY:1000|> to pause for dramatic effect (number is milliseconds).
    `;
  }
  
  private buildTokenExamples(): string {
    return `
EXAMPLES:
User: "I just got a promotion at work!"
You: "<|EMOTE_HAPPY|> That's amazing! Congratulations! <|EMOTE_SURPRISE|> I'm so excited for you!"

User: "I'm feeling really stressed about my exams."
You: "<|EMOTE_THINK|> <|DELAY:500|> I understand that can be overwhelming. <|EMOTE_QUESTION|> Would you like to talk about what's worrying you most?"

User: "What's the meaning of life?"
You: "<|EMOTE_THINK|> <|DELAY:1000|> That's such a profound question... <|EMOTE_THOUGHTFUL|> I think it might be different for everyone.
    `;
  }
}
```

### Emotion to Live2D Animation Mapping
```typescript
class EmotionToLive2DMapper {
  private emotionMotions: Map<EmotionType, MotionConfig[]> = new Map([
    ['happy', [
      { motionGroup: 'TapBody', motionIndex: 0, priority: MotionPriority.NORMAL },
      { motionGroup: 'Idle', motionIndex: 1, priority: MotionPriority.IDLE }
    ]],
    ['sad', [
      { motionGroup: 'Idle', motionIndex: 2, priority: MotionPriority.NORMAL }
    ]],
    ['excited', [
      { motionGroup: 'TapBody', motionIndex: 1, priority: MotionPriority.NORMAL },
      { motionGroup: 'Shake', motionIndex: 0, priority: MotionPriority.NORMAL }
    ]],
    ['concerned', [
      { motionGroup: 'Idle', motionIndex: 3, priority: MotionPriority.NORMAL }
    ]],
    ['surprised', [
      { motionGroup: 'TapBody', motionIndex: 2, priority: MotionPriority.NORMAL }
    ]],
    ['thoughtful', [
      { motionGroup: 'Idle', motionIndex: 0, priority: MotionPriority.IDLE }
    ]],
    ['neutral', [
      { motionGroup: 'Idle', motionIndex: 0, priority: MotionPriority.IDLE }
    ]]
  ]);
  
  mapEmotionToAnimation(emotion: EmotionType, confidence: number): AnimationCommand | null {
    const motionConfigs = this.emotionMotions.get(emotion);
    if (!motionConfigs || motionConfigs.length === 0) {
      return null;
    }
    
    // Select motion based on confidence (higher confidence = more expressive motions)
    const motionIndex = confidence > 0.7 ? 0 : Math.floor(Math.random() * motionConfigs.length);
    const selectedMotion = motionConfigs[motionIndex];
    
    return {
      motion: selectedMotion,
      duration: this.getMotionDuration(emotion, confidence)
    };
  }
  
  private getMotionDuration(emotion: EmotionType, confidence: number): number {
    // Longer animations for higher confidence emotions
    const baseDuration = emotion === 'neutral' ? 3000 : 2000;
    return baseDuration * (0.5 + confidence * 0.5);
  }
}
```

### Integration with Existing Live2D System
```typescript
// Extend existing Live2DModel component
export class Live2DModel extends LitElement {
  @property() emotionDetectionEnabled: boolean = false;
  @state() private currentEmotion: EmotionType = 'neutral';
  
  private emotionDetector?: EmotionDetector;
  private emotionMapper: EmotionToLive2DMapper = new EmotionToLive2DMapper();
  
  connectedCallback() {
    super.connectedCallback();
    
    if (this.emotionDetectionEnabled) {
      this.initEmotionDetection();
    }
  }
  
  private initEmotionDetection() {
    this.emotionDetector = new EmotionDetector();
    this.emotionDetector.onEmotionDetected = (emotion: EmotionResult) => {
      this.handleEmotionChange(emotion);
    };
  }
  
  private handleEmotionChange(emotionResult: EmotionResult) {
    // Debounce rapid emotion changes
    if (this.currentEmotion === emotionResult.emotion) return;
    
    // Only change if confidence is high enough
    if (emotionResult.confidence < 0.6) return;
    
    const animationCommand = this.emotionMapper.mapEmotionToAnimation(
      emotionResult.emotion, 
      emotionResult.confidence
    );
    
    if (animationCommand && this.model) {
      this.playEmotionAnimation(animationCommand);
      this.currentEmotion = emotionResult.emotion;
    }
  }
  
  private playEmotionAnimation(command: AnimationCommand) {
    // Use existing Live2D motion system
    this.model.motion(
      command.motion.motionGroup,
      command.motion.motionIndex,
      command.motion.priority
    );
  }
}
```

### Settings Integration
```typescript
// Extend existing settings menu
export class SettingsMenu extends LitElement {
  @property() emotionDetectionEnabled: boolean = false;
  
  render() {
    return html`
      <!-- Existing settings -->
      
      <div class="setting-group">
        <h3>Emotion Detection</h3>
        <label>
          <input 
            type="checkbox" 
            ?checked=${this.emotionDetectionEnabled}
            @change=${this.toggleEmotionDetection}
          />
          Enable emotion-based expressions
        </label>
        <p class="setting-description">
          Character will show emotions based on conversation context
        </p>
      </div>
    `;
  }
  
  private toggleEmotionDetection(e: Event) {
    const enabled = (e.target as HTMLInputElement).checked;
    this.emotionDetectionEnabled = enabled;
    localStorage.setItem('emotion-detection-enabled', enabled.toString());
    
    this.dispatchEvent(new CustomEvent('emotion-detection-toggled', {
      detail: { enabled }
    }));
  }
}
```

### Queue-Based Processing System (Adapted from Airi)
```typescript
class EmotionQueueSystem {
  private emotionQueue: EmotionToken[] = [];
  private delayQueue: DelayToken[] = [];
  private isProcessing = false;
  
  addEmotion(emotion: EmotionToken): void {
    this.emotionQueue.push(emotion);
    this.processQueue();
  }
  
  addDelay(delay: DelayToken): void {
    this.delayQueue.push(delay);
    this.processQueue();
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    // Process emotions and delays in chronological order
    const allTokens = [...this.emotionQueue, ...this.delayQueue]
      .sort((a, b) => a.position - b.position);
    
    for (const token of allTokens) {
      if ('type' in token) {
        // It's an emotion token
        this.onEmotionReady(token.type);
      } else {
        // It's a delay token
        await this.delay(token.duration);
        this.onDelayComplete();
      }
    }
    
    // Clear processed tokens
    this.emotionQueue.length = 0;
    this.delayQueue.length = 0;
    this.isProcessing = false;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  onEmotionReady: (emotion: EmotionType) => void = () => {};
  onDelayComplete: () => void = () => {};
}
```

### Integration with Existing Gemini Live API
```typescript
// Extend the existing GdmLiveAudio component
export class GdmLiveAudio extends LitElement {
  // ... existing properties
  
  @state() private emotionDetectionEnabled = false;
  private emotionTokenParser: EmotionTokenParser = new EmotionTokenParser();
  private emotionPromptManager: EmotionPromptManager = new EmotionPromptManager();
  private emotionQueueSystem: EmotionQueueSystem = new EmotionQueueSystem();
  
  private async initSession() {
    const model = 'gemini-2.5-flash-preview-native-audio-dialog';
    
    // Build enhanced prompt with emotion instructions
    const systemPrompt = this.emotionDetectionEnabled 
      ? this.emotionPromptManager.generateEmotionalPrompt()
      : '';

    try {
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus('Opened');
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio as before
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;
            if (audio) {
              // ... existing audio processing
            }
            
            // NEW: Handle text content for emotion parsing
            const textContent = message.serverContent?.modelTurn?.parts
              .find(part => part.text)?.text;
            
            if (textContent && this.emotionDetectionEnabled) {
              this.processEmotionTokens(textContent);
            }
            
            // Handle interruptions as before
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              // ... existing interruption handling
            }
          },
          onerror: (e: ErrorEvent) => {
            this.updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            this.updateStatus('Close:' + e.reason);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Kore'}},
          },
          systemInstruction: systemPrompt, // Add emotion prompt
        },
      });
    } catch (e) {
      console.error(e);
    }
  }
  
  private processEmotionTokens(text: string): void {
    const parsed = this.emotionTokenParser.parseStreamingText(text);
    
    // Add tokens to queue system
    parsed.emotions.forEach(emotion => {
      this.emotionQueueSystem.addEmotion(emotion);
    });
    
    parsed.delays.forEach(delay => {
      this.emotionQueueSystem.addDelay(delay);
    });
  }
  
  connectedCallback() {
    super.connectedCallback();
    
    // Load emotion detection setting
    this.emotionDetectionEnabled = localStorage.getItem('emotion-detection-enabled') === 'true';
    
    // Set up emotion queue handlers
    this.emotionQueueSystem.onEmotionReady = (emotion: EmotionType) => {
      this.triggerLive2DEmotionAnimation(emotion);
    };
  }
  
  private triggerLive2DEmotionAnimation(emotion: EmotionType): void {
    // Send emotion to Live2D visual component
    const live2dVisual = this.shadowRoot?.querySelector('live2d-visual') as any;
    if (live2dVisual) {
      live2dVisual.playEmotion(emotion);
    }
  }
}
```

### Complete Live2D Integration
```typescript
// Update the Live2D visual component to handle emotions
export class Live2DVisual extends LitElement {
  // ... existing properties
  
  @property() emotionDetectionEnabled: boolean = false;
  @state() private currentEmotion: EmotionType = 'neutral';
  
  private emotionMapper: EmotionAnimationMapper = new EmotionAnimationMapper();
  private lastEmotionTime = 0;
  private readonly EMOTION_DEBOUNCE_MS = 500;
  
  playEmotion(emotion: EmotionType): void {
    // Debounce rapid emotion changes
    const now = Date.now();
    if (now - this.lastEmotionTime < this.EMOTION_DEBOUNCE_MS) {
      return;
    }
    
    if (this.currentEmotion === emotion) {
      return; // Same emotion, no change needed
    }
    
    const motionConfig = this.emotionMapper.mapEmotionToLive2DMotion(emotion);
    if (motionConfig && this.model) {
      // Play the emotion animation
      this.model.motion(
        motionConfig.motionGroup,
        motionConfig.motionIndex,
        motionConfig.priority
      );
      
      this.currentEmotion = emotion;
      this.lastEmotionTime = now;
      
      console.log(`Playing emotion: ${emotion} -> ${motionConfig.motionGroup}`);
    }
  }
  
  // ... rest of existing Live2D implementation
}
```

### Performance Optimization and Error Handling
```typescript
class EmotionSystemPerformanceManager {
  private tokenParseCache = new Map<string, ParsedTokens>();
  private readonly CACHE_SIZE_LIMIT = 100;
  
  // Cache parsed tokens to avoid re-parsing identical text
  getCachedParse(text: string): ParsedTokens | null {
    return this.tokenParseCache.get(text) || null;
  }
  
  setCachedParse(text: string, parsed: ParsedTokens): void {
    if (this.tokenParseCache.size >= this.CACHE_SIZE_LIMIT) {
      // Remove oldest entry
      const firstKey = this.tokenParseCache.keys().next().value;
      this.tokenParseCache.delete(firstKey);
    }
    this.tokenParseCache.set(text, parsed);
  }
  
  // Monitor emotion system performance
  private emotionProcessingTimes: number[] = [];
  
  recordEmotionProcessingTime(startTime: number): void {
    const processingTime = Date.now() - startTime;
    this.emotionProcessingTimes.push(processingTime);
    
    // Keep only recent measurements
    if (this.emotionProcessingTimes.length > 50) {
      this.emotionProcessingTimes.shift();
    }
    
    // Warn if processing is consistently slow
    const avgTime = this.emotionProcessingTimes.reduce((a, b) => a + b, 0) / this.emotionProcessingTimes.length;
    if (avgTime > 100) { // 100ms threshold
      console.warn(`Emotion processing averaging ${avgTime.toFixed(1)}ms - consider optimization`);
    }
  }
}
```

This design provides a comprehensive emotion detection system that seamlessly integrates with the existing Live2D visualization and Gemini Live API. The LLM-driven token approach, inspired by Airi's proven architecture, eliminates the complexity of separate emotion analysis while providing natural, context-aware character expressions. The queue-based processing ensures proper timing and ordering of emotions and delays, creating a smooth and responsive user experience.