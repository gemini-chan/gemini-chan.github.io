# Design Document - Live2D Visualization

Status: PoC complete (Live2D gated behind fallback). ZIP models load and render; audio-responsive animations active. Cubism Core autoload via Vite plugin + runtime guard.

## Overview

This design adapts Airi's Vue-based Live2D implementation to our TypeScript/Lit architecture. The system will replace the current Three.js sphere visualization with a Live2D character that responds to audio input/output in real-time. The design emphasizes simplicity while maintaining the engaging character experience.

## Architecture

### Build & Assets Management
- Use @proj-airi/unplugin-live2d-sdk (Vite) to download and place Cubism Core assets under public/assets/js/CubismSdkForWeb-5-r.3/.
- Keep a resilient script include in index.html that points to Core: /assets/js/CubismSdkForWeb-5-r.3/Core/live2dcubismcore.min.js.
- At runtime, guard for window.Live2DCubismCore before importing pixi-live2d-display/cubism4; if absent, inject the script tag dynamically and surface a loading message.
- Document the expected public path layout so self-hosting remains straightforward.

### CORS & Hosting Guidance
- Prefer same-origin hosting for model3.json and texture assets to avoid CORS issues during development.
- When using remote URLs, ensure appropriate CORS headers (Access-Control-Allow-Origin) are present.
- For .zip models, consider hosting on static origins that serve appropriate content types and allow range requests.


### Component Hierarchy
```
gdm-live-audio (existing)
├── settings-menu (existing)
├── live2d-gate (new)
│   ├── visual-3d fallback (existing)
│   └── live2d-visual (new)
│       ├── live2d-canvas (new)
│       └── live2d-model (new)
└── status display (existing)
```

### Technology Stack
- **PIXI.js** - 2D rendering engine (replaces Three.js)
- **pixi-live2d-display** - Live2D model rendering library
- **JSZip** - For loading zipped Live2D model files
- **Lit** - Web components framework
- **TypeScript** - Type safety and modern JavaScript features

## Components and Interfaces

### 1. Live2DVisual Component
**File**: `live2d-visual.ts`

```typescript
@customElement('live2d-visual')
export class Live2DVisual extends LitElement {
  @property() inputNode: AudioNode;
  @property() outputNode: AudioNode;
  @property() modelSrc: string = '/assets/live2d/default-model.zip';
  @property() paused: boolean = false;
  
  @state() private modelLoaded = false;
  @state() private error = '';
  
  private canvas!: Live2DCanvas;
  private model!: Live2DModel;
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
}
```

### 2. Live2DCanvas Component
**File**: `live2d-canvas.ts`

```typescript
@customElement('live2d-canvas')
export class Live2DCanvas extends LitElement {
  @property() width: number = 800;
  @property() height: number = 600;
  @property() resolution: number = 2;
  
  private pixiApp!: PIXI.Application;
  private canvasElement!: HTMLCanvasElement;
  
  async initPixiStage(): Promise<PIXI.Application>;
  captureFrame(): Promise<Blob | null>;
}
```

### 3. Live2DModel Component
**File**: `live2d-model.ts`

```typescript
@customElement('live2d-model')
export class Live2DModel extends LitElement {
  @property() app!: PIXI.Application;
  @property() modelSrc: string = '';
  @property() mouthOpenSize: number = 0;
  @property() focusAt: {x: number, y: number} = {x: 0, y: 0};
  @property() paused: boolean = false;
  
  private model!: Live2DModel;
  private eyeFocusController!: IdleEyeFocus;
  
  async loadModel(src: string): Promise<void>;
  setMouthOpen(value: number): void;
  setFocus(x: number, y: number): void;
  playMotion(group: string, index?: number): void;
}
```

### 4. Audio Integration Interface
```typescript
interface AudioVisualizationData {
  inputLevel: number;      // 0-255 from analyser
  outputLevel: number;     // 0-255 from analyser
  inputFrequency: Uint8Array;
  outputFrequency: Uint8Array;
}

interface Live2DAnimationParams {
  mouthOpen: number;       // 0-1 based on audio output
  eyeFocusX: number;       // -1 to 1
  eyeFocusY: number;       // -1 to 1
  bodyScale: number;       // 0.8-1.2 based on audio intensity
}
```

## Data Models

### Live2D Model Configuration
```typescript
interface Live2DModelConfig {
  src: string;                    // URL or File path
  scale: number;                  // Default 1.0
  position: {x: number, y: number}; // Offset from center
  motions: {
    idle: string[];
    speaking: string[];
    listening: string[];
  };
}

interface Live2DState {
  modelLoaded: boolean;
  currentMotion: {group: string, index: number};
  availableMotions: MotionInfo[];
  isAnimating: boolean;
  lastUpdateTime: number;
}
```

### Audio Processing Pipeline
```typescript
interface AudioProcessor {
  inputAnalyser: Analyser;
  outputAnalyser: Analyser;
  
  update(): void;
  getVisualizationData(): AudioVisualizationData;
  mapToAnimationParams(): Live2DAnimationParams;
}
```

## Error Handling

### Live2D Gate Fallback Flow
- Live2DGate renders visual-3d until live2d-visual dispatches `live2d-loaded`.
- On `live2d-error`, Live2DGate continues showing the fallback and surfaces the error.
- Live2DGate lazy-loads the fallback module (`visual-3d`) and detaches it once Live2D is ready to free GPU resources.
- Visibility handling: when page is hidden, pause PIXI ticker; resume on visible.

### Model Loading Errors

- If Cubism Core is missing (window.Live2DCubismCore absent), surface a clear overlay and log instruction. A guard MUST exist before dynamic import of 'pixi-live2d-display/cubism4'.
- Add retry button for recoverable errors (network). Exponential backoff implemented.
- CORS constraints for remote .zip and .model3.json MUST be documented; prefer same-origin for development. 
- **File not found**: Display error message, fall back to default model
- **Invalid model format**: Show user-friendly error, provide model format guide
- **Network timeout**: Retry mechanism with exponential backoff
- **Memory issues**: Reduce model quality, show performance warning

### Runtime Errors
- **PIXI initialization failure**: Fall back to simple 2D canvas rendering
- **Animation errors**: Continue with static model, log errors
- **Audio processing errors**: Maintain visual without audio sync

### Fallback Strategy
```typescript
enum FallbackLevel {
  FULL_LIVE2D = 0,      // Normal operation
  STATIC_LIVE2D = 1,    // Model without animations
  SIMPLE_AVATAR = 2,    // Basic 2D sprite
  TEXT_ONLY = 3         // Text-based status only
}
```

## Testing Strategy

### Unit Tests
- **Component rendering**: Verify Lit components render correctly
- **Audio analysis**: Test frequency data processing
- **Model loading**: Mock PIXI and Live2D libraries
- **Animation mapping**: Test audio-to-animation parameter conversion

### Integration Tests
- **Audio pipeline**: End-to-end audio processing to visual updates
- **Model lifecycle**: Loading, animating, cleanup
- **Error scenarios**: Network failures, invalid models, browser compatibility

### Performance Tests
- **Memory usage**: Monitor PIXI texture memory
- **Frame rate**: Ensure 60fps with Live2D animations
- **Audio latency**: Measure input-to-visual response time (<100ms)

### Browser Compatibility
- **WebGL support**: Test PIXI.js compatibility
- **Audio API**: Verify Web Audio API support
- **File loading**: Test various model formats and sizes

## Implementation Details

### PIXI.js Setup (adapted from Airi)
```typescript
async function initPixiApp(container: HTMLElement, width: number, height: number) {
  // Register Live2D with PIXI
  Live2DModel.registerTicker(PIXI.Ticker);
  
  const app = new PIXI.Application({
    width: width * 2,  // High DPI
    height: height * 2,
    backgroundAlpha: 0,
    preserveDrawingBuffer: true,
  });
  
  // Responsive canvas styling
  app.view.style.width = '100%';
  app.view.style.height = '100%';
  app.view.style.objectFit = 'cover';
  
  container.appendChild(app.view);
  return app;
}
```

### Live2D Model Loading (adapted from Airi)
```typescript
async function loadLive2DModel(app: PIXI.Application, modelSrc: string) {
  // Guard: ensure Cubism Core is available BEFORE importing cubism4
  if (!(window as any).Live2DCubismCore) {
    // Attempt to load from public path
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/assets/js/CubismSdkForWeb-5-r.3/Core/live2dcubismcore.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Cubism Core missing'));
      document.head.appendChild(s);
    });
  }

  const { Live2DModel } = await import('pixi-live2d-display/cubism4');
  const model = await Live2DModel.from(modelSrc);

  // Configure model
  model.anchor.set(0.5, 0.5);
  model.scale.set(1.0, 1.0);
  model.x = app.screen.width / 2;
  model.y = app.screen.height;

  app.stage.addChild(model);
  return model;
}
```

### Audio-to-Animation Mapping (Based on Airi's Implementation)

- Mapper parameters (threshold, scale, attack, release) are configurable (future UI). Defaults applied for stable lip-sync.
```typescript
class AudioToAnimationMapper {
  private analyser: AnalyserNode;
  private volumeHistory: number[] = [];
  private readonly HISTORY_SIZE = 10;
  
  constructor(audioContext: AudioContext, sourceNode: AudioNode) {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    sourceNode.connect(this.analyser);
  }
  
  // Based on Airi's getVolumeWithMinMaxNormalizeWithFrameUpdates
  getVolumeWithNormalization(): number {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Calculate RMS volume
    const sum = dataArray.reduce((acc, val) => acc + val * val, 0);
    const rms = Math.sqrt(sum / dataArray.length);
    
    // Maintain volume history for smoothing
    this.volumeHistory.push(rms);
    if (this.volumeHistory.length > this.HISTORY_SIZE) {
      this.volumeHistory.shift();
    }
    
    // Normalize with min/max from history
    const min = Math.min(...this.volumeHistory);
    const max = Math.max(...this.volumeHistory);
    const normalized = max > min ? (rms - min) / (max - min) : 0;
    
    return Math.min(1.0, normalized);
  }
  
  mapToLive2DParams(): Live2DAnimationParams {
    const volume = this.getVolumeWithNormalization();
    
    return {
      mouthOpen: volume,                    // Direct volume mapping like Airi
      eyeFocusX: 0,                        // Handled by idle eye focus system
      eyeFocusY: 0,                        // Handled by idle eye focus system  
      bodyScale: 1.0 + (volume * 0.1),    // Subtle scaling based on volume
    };
  }
}
```

### Custom Zip Loader Integration
The system will include Airi's zip loader utility to support models without standard `model3.json` files:

```typescript
// Import and configure the custom zip loader
import './utils/live2d-zip-loader';

// The loader automatically handles:
// - Models packaged as .zip files
// - Missing model3.json files (generates fake settings)
// - Texture and motion file discovery
```

### Idle Animation System (Based on Airi's Implementation)

- Idle eye focus + blink system runs when mouth activity is low. Breathing micro-motion applied to body angle. 
```typescript
class IdleEyeFocus {
  private nextSaccadeTime = 0;
  private focusTarget = {x: 0, y: 0};
  private lastSaccadeAt = 0;
  
  update(model: Live2DModel, currentTime: number) {
    // Only update when model is idle (not playing other motions)
    const motionManager = model.internalModel.motionManager;
    const isIdle = !motionManager.state.currentGroup || 
                   motionManager.state.currentGroup === motionManager.groups.idle;
    
    if (!isIdle) return;
    
    if (currentTime >= this.nextSaccadeTime || currentTime < this.lastSaccadeAt) {
      // Generate random saccade movement (based on Airi's pattern)
      this.focusTarget = {
        x: (Math.random() - 0.5) * 2,    // -1 to 1
        y: (Math.random() - 0.3) * 1.4   // -0.3 to 1.1 (slightly upward bias)
      };
      
      this.lastSaccadeAt = currentTime;
      this.nextSaccadeTime = currentTime + this.randomSaccadeInterval();
      
      // Apply focus with dampening
      model.focus(this.focusTarget.x * 0.5, this.focusTarget.y * 0.5, false);
    }
    
    // Update focus controller and apply eye parameters
    model.focusController.update(currentTime - this.lastSaccadeAt);
    const coreModel = model.internalModel.coreModel;
    
    // Smooth interpolation to target (like Airi's lerp approach)
    const currentX = coreModel.getParameterValueById('ParamEyeBallX');
    const currentY = coreModel.getParameterValueById('ParamEyeBallY');
    
    coreModel.setParameterValueById('ParamEyeBallX', 
      this.lerp(currentX, this.focusTarget.x, 0.3));
    coreModel.setParameterValueById('ParamEyeBallY', 
      this.lerp(currentY, this.focusTarget.y, 0.3));
  }
  
  private randomSaccadeInterval(): number {
    return 2000 + Math.random() * 3000; // 2-5 seconds
  }
  
  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }
}
```

### Performance Optimizations (Based on Airi's Patterns)
```typescript
class Live2DPerformanceManager {
  private animationId: number = 0;
  
  // Pause/resume render loop based on visibility
  handlePause(pixiApp: PIXI.Application, paused: boolean) {
    if (paused) {
      pixiApp.stop(); // Stop entire PIXI ticker
    } else {
      pixiApp.start();
    }
  }
  
  // Resource cleanup on model change
  cleanupModel(pixiApp: PIXI.Application, oldModel: Live2DModel) {
    if (oldModel) {
      pixiApp.stage.removeChild(oldModel);
      oldModel.destroy(); // Free WebGL resources
    }
  }
  
  // Motion priority management
  playMotionWithPriority(model: Live2DModel, group: string, index?: number) {
    // Force override current motion to prevent delays
    return model.motion(group, index, MotionPriority.FORCE);
  }
  
  // Eye blink fix (Airi's "hacky" but effective solution)
  hookMotionManager(model: Live2DModel) {
    const motionManager = model.internalModel.motionManager;
    const originalUpdate = motionManager.update.bind(motionManager);
    
    motionManager.update = (coreModel: any, now: number) => {
      const result = originalUpdate(coreModel, now);
      
      // Manually update eye blink during idle to prevent conflicts
      const isIdle = !motionManager.state.currentGroup || 
                     motionManager.state.currentGroup === motionManager.groups.idle;
      
      if (isIdle && model.internalModel.eyeBlink) {
        const deltaTime = (now - this.lastUpdateTime) / 1000;
        model.internalModel.eyeBlink.updateParameters(coreModel, deltaTime);
      }
      
      this.lastUpdateTime = now;
      return result;
    };
  }
  
  private lastUpdateTime = 0;
}
```

### State Management Pattern (Adapted from Airi's Pinia approach)

- Current project uses Lit reactive properties; a dedicated Live2DState is TBD (future task). Persist model URL in localStorage via Settings.
```typescript
// Simple state management for Lit components (without Pinia)
class Live2DState {
  private static instance: Live2DState;
  private listeners: Set<(state: any) => void> = new Set();
  
  public state = {
    modelSrc: '/assets/live2d/default-model.zip',
    modelLoaded: false,
    currentMotion: { group: 'Idle', index: 0 },
    availableMotions: [],
    position: { x: 0, y: 0 },
    scale: 1.0,
    mouthOpenSize: 0,
    focusAt: { x: 0, y: 0 }
  };
  
  static getInstance(): Live2DState {
    if (!Live2DState.instance) {
      Live2DState.instance = new Live2DState();
    }
    return Live2DState.instance;
  }
  
  subscribe(callback: (state: any) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  updateState(updates: Partial<typeof this.state>) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(callback => callback(this.state));
  }
}
```

### Mobile Responsiveness (Inspired by Airi's approach)
```typescript
class ResponsiveManager {
  private isMobile = false;
  
  constructor() {
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());
  }
  
  private checkMobile() {
    this.isMobile = window.innerWidth < 768; // md breakpoint
  }
  
  getModelScale(baseScale: number): number {
    // Adjust scaling for mobile like Airi does
    const offsetFactor = this.isMobile ? 2.2 : 2.2;
    return baseScale * offsetFactor;
  }
  
  getModelPosition(width: number, height: number): {x: number, y: number} {
    return {
      x: width / 2,
      y: height + (this.isMobile ? -50 : 0) // Slight adjustment for mobile
    };
  }
}
```

This design provides a solid foundation for implementing Live2D visualization while maintaining compatibility with the existing audio processing pipeline and Lit-based architecture. The implementation incorporates proven patterns from Airi's production system, including performance optimizations, state management, and responsive design considerations.