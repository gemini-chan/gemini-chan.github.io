# Project Structure

## Root Files
- `index.html` - Entry point with import maps for ES modules
- `index.tsx` - Main application component (`gdm-live-audio`)
- `index.css` - Global styles (minimal)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Build configuration

## Core Components
- `visual-3d.ts` - Current 3D visualization (to be replaced with Live2D)
- `settings-menu.ts` - API key management UI
- `analyser.ts` - Audio frequency analysis utility
- `utils.ts` - Audio encoding/decoding utilities

## Visualization Components
- `live2d-visual.ts` - Live2D character visualization (planned)
- `sphere-shader.ts` - Legacy 3D sphere vertex shader
- `backdrop-shader.ts` - Legacy 3D background shaders

## Live2D Integration
- Live2D models stored in `public/live2d/` directory
- Character animations driven by audio analysis data
- Fallback to simple visualization if Live2D fails to load

## Testing
- `*.test.ts` - Component tests using Web Test Runner
- Tests follow pattern: render → query DOM → assert behavior

## Asset Organization
- `public/` - Static assets (EXR textures)
- `node_modules/` - Dependencies
- `.git/` - Version control

## Naming Conventions
- Components use kebab-case custom elements (`gdm-live-audio`)
- Files use kebab-case (`settings-menu.ts`)
- Classes use PascalCase (`GdmLiveAudio`)
- Private methods prefixed with underscore (`_toggleSettings`)

## Architecture Patterns
- Web Components with Lit decorators (`@customElement`, `@state`, `@property`)
- Event-driven communication between components
- Reactive properties for state management
- Shadow DOM for component encapsulation