# Requirements Document

## Introduction

This feature involves replacing the current 3D sphere visualization with a Live2D avatar system for Gemini-chan. Live2D provides a simpler implementation path compared to full 3D VRM avatars while still delivering an engaging anime-style character experience. The system should maintain real-time audio responsiveness and provide a more character-focused visual experience.

## Requirements

Note: This document reflects current progress and decisions. We have reached a working Proof of Concept (PoC): Live2D models, including ZIP archives without model3.json, load and render correctly with audio-responsive animations. Live2D integration is gated behind a fallback with the 3D sphere, with an emphasis on graceful failure and performance (lazy-loading and teardown). A Cubism Core autoload requirement has been added.

### Requirement 1

**User Story:** As a user, I want to see a Live2D animated character instead of a 3D sphere, so that I have a more engaging and character-focused interaction experience.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a Live2D character model instead of the current 3D sphere
2. WHEN audio input is detected THEN the Live2D character SHALL respond with appropriate animations (mouth movement, eye blinks, etc.)
3. WHEN the AI is speaking THEN the Live2D character SHALL animate to show speaking behavior
4. WHEN there is no audio activity THEN the Live2D character SHALL display idle animations (eye blinks, saccades, subtle breathing)

### Requirement 2

**User Story:** As a developer, I want a simpler visualization system than full 3D VRM, so that the implementation is more maintainable and performant.

#### Acceptance Criteria

1. WHEN implementing the Live2D system THEN it SHALL be less complex than a full VRM 3D avatar implementation
2. WHEN the Live2D system runs THEN it SHALL maintain good performance on standard web browsers
3. WHEN integrating Live2D THEN the system SHALL use established Live2D web libraries
4. IF future expansion is needed THEN the architecture SHALL allow for potential VRM 3D avatar integration

### Requirement 3

**User Story:** As a user, I want the Live2D character to respond to audio in real-time, so that the interaction feels natural and responsive.

#### Acceptance Criteria

1. WHEN I speak into the microphone THEN the character SHALL respond within 100ms with visual feedback
2. WHEN the AI responds with audio THEN the character's mouth movements SHALL sync with the speech
3. WHEN audio levels change THEN the character animations SHALL reflect the intensity appropriately
4. WHEN there are audio interruptions THEN the character SHALL handle transitions smoothly

### Requirement 4

**User Story:** As a user, I want the Live2D character to have personality through basic animations, so that Gemini-chan feels more alive and engaging.

#### Acceptance Criteria

1. WHEN the character is idle THEN it SHALL display subtle breathing and blinking animations
2. WHEN the user starts speaking THEN the character SHALL show acknowledgment through eye movement or head tilts
3. WHEN audio input is detected THEN the character SHALL display attentive animations
4. WHEN the system is processing THEN the character SHALL show appropriate waiting animations

### Requirement 5

Note: Live2D uses the official Cubism 4/5 Core SDK. The application MUST ensure the core (live2dcubismcore.min.js and associated artifacts) is available globally before loading pixi-live2d-display/cubism4. This MUST be automated (no manual user steps) and verified at runtime with a guard.

**User Story:** As a developer, I want to maintain the existing audio processing pipeline, so that the Live2D integration doesn't break current functionality.

#### Acceptance Criteria

1. WHEN implementing Live2D THEN the existing audio input/output processing SHALL remain unchanged
2. WHEN Live2D is active THEN the audio analysis data SHALL be available for character animation
3. WHEN switching visualization systems THEN the settings menu and API key management SHALL continue to work
4. WHEN Live2D fails to load THEN the system SHALL provide appropriate fallback behavior

### Requirement 6

**User Story:** As a user, I want the visualization to gracefully fall back if Live2D cannot run, so that the app remains usable on my device.

#### Acceptance Criteria

1. WHEN Live2D hasn't loaded or errors THEN the system SHALL show the existing 3D sphere visualization as a fallback
2. WHEN Live2D loads successfully THEN the fallback SHALL be fully detached to free resources
3. WHEN Live2D encounters a runtime error THEN the system SHALL degrade to a static model or fallback with a visible status message
4. WHEN the page is hidden THEN the render loop SHALL pause; WHEN visible again THEN it SHALL resume

### Requirement 7

**User Story:** As a developer, I want Cubism Core autoload to be automatic and verified, so that users don't need to configure it manually.

#### Acceptance Criteria

1. WHEN the app boots THEN window.Live2DCubismCore SHALL exist before dynamic-importing pixi-live2d-display/cubism4
2. IF window.Live2DCubismCore is missing THEN the system SHALL inject or reference the Core script from public/assets and show a loading status
3. IF Core cannot be loaded THEN the system SHALL show a clear error overlay and use the fallback visualization
4. The build SHALL include an automated step (e.g., @proj-airi/unplugin-live2d-sdk or equivalent) that ensures Core assets are emitted into public/assets

### Requirement 8

**User Story:** As a user, I want to configure the Live2D model source, so that I can choose between bundled and remote models.

#### Acceptance Criteria

1. WHEN I specify a model URL or .zip in Settings THEN the system SHALL persist it in localStorage and use it on next load
2. WHEN the model URL is invalid or blocked by CORS THEN the system SHALL display a helpful error and keep the fallback active
3. WHEN the model loads THEN the system SHALL fit it to the canvas and maintain aspect ratio across common viewports
4. The system SHALL support at least model3.json URLs; .zip support MAY be provided via library support or a custom loader

### Requirement 9

**User Story:** As a mobile user, I want the Live2D visualization to perform well and scale appropriately, so that the experience remains smooth.

#### Acceptance Criteria

1. WHEN on small screens THEN the model SHALL scale and position appropriately without clipping
2. WHEN on low-end devices THEN the system SHALL reduce animation complexity (e.g., lower ticker rate or simplified motions)
3. WHEN using touch interactions THEN the model SHALL avoid blocking critical app controls
4. Target performance SHALL be responsive with audio-to-visual latency under 100ms on modern mobile browsers

### Requirement 10

**User Story:** As a developer, I want security and compatibility documented, so that remote assets work reliably.

#### Acceptance Criteria

1. CORS requirements and recommended same-origin hosting SHALL be documented
2. The system SHALL log and surface actionable errors for network, format, and Core-missing scenarios
3. The system SHALL document supported browsers (WebGL + Web Audio API)