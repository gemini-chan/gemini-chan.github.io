# Tech Stack

## Core Technologies
- **TypeScript** - Primary language with ES2022 target
- **Lit** - Web components framework for UI
- **Vite** - Build tool and dev server
- **Live2D** - 2D character animation and rendering
- **Google GenAI** - Real-time AI voice conversation API

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
- Environment variables loaded via `.env` files
- Path aliases configured (`@/*` maps to workspace root)

## Common Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test
```

## Build Configuration
- Vite config exposes `GEMINI_API_KEY` environment variable
- TypeScript configured for experimental decorators (Lit requirement)
- Module resolution set to "bundler" for modern bundling