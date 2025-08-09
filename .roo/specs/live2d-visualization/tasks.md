# Implementation Plan

- [x] 1. Set up project structure and core interfaces (commit: 6278ef9)
  - Create directory structure for Live2D components
  - Define TypeScript interfaces for Live2D integration
  - Set up PIXI.js and pixi-live2d-display dependencies
  - _Requirements: 1.1, 2.1_

- [ ] 2. Implement Live2D canvas foundation
- [x] 2.1 Create Live2DCanvas component (commit: 6278ef9)
  - Write Live2DCanvas Lit component with PIXI.js initialization
  - Implement responsive canvas sizing and high-DPI support
  - Add proper cleanup and resource management
  - _Requirements: 1.1, 2.1_

- [x] 2.2 Create Live2DModel component skeleton (commit: 6278ef9)
  - Write Live2DModel Lit component structure
  - Implement model loading interface using Live2DFactory
  - Add basic error handling and fallback mechanisms
  - _Requirements: 1.1, 2.1, 5.4_

- [ ] 3. Implement audio processing integration
- [x] 3.1 Create AudioToAnimationMapper class (commit: 6278ef9)
  - Implement volume analysis with normalization (based on Airi's approach)
  - Create smooth volume history tracking for stable lip-sync
  - Add frequency data processing for enhanced animations
  - _Requirements: 3.1, 3.2_

- [x] 3.2 Integrate audio analysis with existing pipeline (commit: 6278ef9)
  - Connect AudioToAnimationMapper to existing Analyser class
  - Modify GdmLiveAudio to provide audio nodes to Live2D system
  - Ensure audio processing doesn't interfere with existing visualization
  - _Requirements: 3.1, 3.2, 5.1, 5.2_

- [ ] 4. Implement core Live2D model functionality
- [ ] 4.1 Add model loading and initialization
  - Ensure Cubism Core autoload is in place (index.html script + assets in public/ via @proj-airi/unplugin-live2d-sdk)
  - Add guard for window.Live2DCubismCore prior to dynamic import, with dynamic <script> fallback
  - Implement Live2DModel.from(modelUrl) integration
  - Add support for both .model3.json and .zip file formats (zip optional, document CORS requirements)
  - Create custom zip loader utility (based on Airi's implementation) or rely on library support
  - _Requirements: 1.1, 5.4, 7.1, 8.4_

- [ ] 4.2 Implement basic model rendering and positioning
  - Add model scaling and positioning logic
  - Implement responsive model sizing for different screen sizes
  - Create model anchor and transform management
  - _Requirements: 1.1, 1.4_

- [ ] 5. Implement real-time audio-responsive animations
- [ ] 5.1 Add lip-sync functionality
  - Connect volume data to ParamMouthOpenY parameter
  - Implement smooth mouth movement transitions
  - Add volume threshold and sensitivity controls
  - _Requirements: 1.2, 1.3, 3.1, 3.2_

- [x] 5.2 Create idle animation system (commit: 70a15d3)
  - Implement IdleEyeFocus class based on Airi's approach
  - Add random saccade eye movements with proper timing
  - Integrate with motion manager to only run during idle states
  - Implement IdleEyeFocus class based on Airi's approach
  - Add random saccade eye movements with proper timing
  - Integrate with motion manager to only run during idle states
  - _Requirements: 1.4, 4.1, 4.2_

- [ ] 6. Implement performance optimizations
- [x] 6.1 Add render loop management (commit: 53f0650)
  - Implement pause/resume functionality for PIXI ticker (partial; gate unloads fallback)
  - Add performance monitoring and frame rate optimization (TBD)
  - Create resource cleanup for model switching (in place for 3D fallback)
  - Implement pause/resume functionality for PIXI ticker
  - Add performance monitoring and frame rate optimization
  - Create resource cleanup for model switching
  - _Requirements: 2.1, 2.2_

- [ ] 6.2 Implement motion manager optimizations
  - Add the "hacky but effective" eye blink fix from Airi
  - Implement motion priority system with FORCE override
  - Add proper motion state management and transitions
  - _Requirements: 1.4, 2.2, 4.3_

- [ ] 7. Create state management system
- [ ] 7.1 Implement Live2DState class
  - Create centralized state management for Live2D properties
  - Add reactive state updates and listener system
  - Implement localStorage persistence for user preferences
  - _Requirements: 5.1, 5.2_

- [ ] 7.2 Connect state to component reactivity
  - Integrate Live2DState with Lit component reactive properties
  - Add proper state synchronization between components
  - Implement state-driven model parameter updates
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8. Implement error handling and fallbacks
- [x] 8.1 Add model loading error handling (commit: 2cce234)
  - Create graceful fallback for failed model loads
  - Implement retry mechanism with exponential backoff (done)
  - Add user-friendly error messages and recovery options (overlay + retry)
  - Create graceful fallback for failed model loads
  - Implement retry mechanism with exponential backoff
  - Add user-friendly error messages and recovery options
  - _Requirements: 5.4_

- [x] 8.2 Add runtime error handling (commit: 8b6caac)
  - Implement fallback to static model on animation errors (gate)
  - Add PIXI initialization failure handling (status badge + logs)
  - Create degraded mode for low-performance devices (TBD)
  - Implement fallback to static model on animation errors
  - Add PIXI initialization failure handling
  - Create degraded mode for low-performance devices
  - _Requirements: 2.2, 5.4_

- [ ] 9. Replace existing 3D visualization
- [x] 9.1 Integrate Live2D into main application (commit: 6278ef9)
  - Replace visual-3d component with live2d-visual in index.tsx
  - Update GdmLiveAudio to use Live2D instead of Three.js sphere
  - Ensure audio node connections work with new system
  - _Requirements: 1.1, 5.1, 5.2_

- [x] 9.2 Add settings integration (commit: 0cc0de4)
  - Extend settings menu to include Live2D model selection
  - Add Live2D-specific configuration options
  - Implement model file upload functionality (TODO)
  - _Requirements: 5.3_

- [ ] 10. Implement responsive design and mobile support
- [ ] 10.1 Add responsive model scaling
  - Implement ResponsiveManager class based on Airi's approach (spec in design.md)
  - Add breakpoint detection and mobile-specific adjustments (scale, position)
  - Create adaptive model positioning for different screen sizes and orientations
  - _Requirements: 1.4, 4.4, 9.1_

- [ ] 10.2 Optimize for mobile performance
  - Add mobile-specific performance optimizations (reduced tick rate, simplified idle)
  - Implement reduced animation complexity for low-end devices (feature flags)
  - Add touch interaction support for model (do not obstruct app controls)
  - _Requirements: 2.2, 4.4, 9.2, 9.3_

- [ ] 11. Add comprehensive testing
- [ ] 11.1 Create unit tests for core components
  - Write tests for Live2DCanvas component rendering (PIXI mocked)
  - Test AudioToAnimationMapper volume processing (deterministic arrays)
  - Test settings UI model URL input and persistence
  - Add tests for Live2DState management (subscribe/update/unsubscribe)
  - _Requirements: All requirements_

- [ ] 11.2 Add integration tests
  - Test complete audio-to-animation pipeline (mock audio nodes/analyser)
  - Verify model loading and error handling (mock pixi-live2d-display/cubism4)
  - Verify live2d-gate fallback flow and event handling
  - Test responsive behavior across different screen sizes
  - Verify Cubism Core guard path (inject script, missing script)
  - TODO: 11.2.6 Verify model ZIP upload round-trip (future)
  - _Requirements: All requirements_

- [ ] 12. Final integration and polish
- [ ] 12.1 Performance testing and optimization
  - Conduct performance profiling and optimization
  - Test memory usage and WebGL resource management
  - Verify 60fps performance with Live2D animations
  - _Requirements: 2.1, 2.2, 3.1_

- [ ] 12.2 User experience refinements
  - Add smooth transitions between different states
  - Implement loading indicators for model loading
  - Add subtle visual feedback for user interactions
  - _Requirements: 1.4, 4.1, 4.2_