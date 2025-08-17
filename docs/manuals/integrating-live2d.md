# Integrating Live2D Cubism 5 with Vite & TypeScript

This guide provides a comprehensive walkthrough for integrating Live2D Cubism 5 models into a modern web application using Vite and TypeScript. It covers project setup, the rendering pipeline, animation, and advanced features based on the official Live2D Cubism 5 Web SDK.

## 1. Understanding the Cubism 5 Web SDK

A successful integration requires understanding the SDK's components. The SDK is divided into a low-level core engine and a high-level framework.

### SDK Components

The official SDK download contains three essential parts:

*   **Cubism Core**: The high-performance engine for all model calculations. It's a C library compiled to WebAssembly (`.wasm`) and bundled with JavaScript glue code. It is closed-source and handles the deformation of model vertices based on parameter values. It contains no rendering or animation logic.
*   **CubismWebFramework**: A high-level, open-source TypeScript framework that provides the main developer-facing API. It includes modules for:
    *   **Rendering**: A WebGL-based renderer.
    *   **Model Management**: Classes for loading and managing models.
    *   **Animation**: Managers for motions and expressions.
    *   **Physics**: Real-time physics simulation.
    *   **Utilities**: Helpers for math, logging, etc.
*   **CubismWebSamples**: A complete sample application demonstrating the integration of Core and Framework. It's a valuable learning resource but not designed for direct production use.

### Critical SDK Download Information

A common pitfall is cloning the `CubismWebFramework` from GitHub. **The public GitHub repository does not include the Cubism Core (`.wasm` engine)**. To get a functional SDK, you must:

1.  Go to the [official Live2D Cubism SDK download page](https://www.live2d.com/en/sdk/download/web/).
2.  Agree to the license and download the "Live2D Cubism SDK for Web" package.
3.  Unzip the package to find the complete directory structure, including the essential `Core` folder.

## 2. Project Setup: Vite & TypeScript

This section details how to set up a Vite project to work with the Live2D SDK.

### Project Initialization

1.  Create a new Vite project (e.g., with the Vue and TypeScript template):
    ```bash
    npm create vite@latest my-live2d-app -- --template vue-ts
    ```
2.  Navigate into the project and install dependencies:
    ```bash
    cd my-live2d-app
    npm install
    ```

### SDK File Integration

1.  **Asset and Library Directories**:
    *   In `public/`, create a `live2d/` directory. This will hold model assets and the `Core` library.
    *   In `src/`, create a `lib/live2d/` directory. This will house the `Framework` source code.

2.  **Copy SDK Files**:
    *   Copy the `Core` directory from the official SDK download to `public/live2d/`.
    *   Copy the contents of the `Framework/src` directory from the SDK download to `src/lib/live2d/framework/`.

The final project structure should look like this:

```
my-live2d-app/
├── public/
│   └── live2d/
│       ├── Core/
│       │   ├── live2dcubismcore.min.js
│       │   └── live2dcubismcore.wasm
│       └── Hiyori/
│           └── ... (model assets)
├── src/
│   ├── lib/
│   │   └── live2d/
│   │       └── framework/
│   │           └── ... (all framework .ts files)
│   ├── main.ts
│   └── ...
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.mts
```

### Build Environment Configuration

#### `tsconfig.json`

Update your TypeScript configuration to handle the SDK's modules and create a path alias for cleaner imports.

| Compiler Option | Value | Rationale |
| :--- | :--- | :--- |
| `target` | `"ES2022"` | Aligns with modern browser capabilities. |
| `module` | `"ESNext"` | Uses modern ECMAScript module syntax, native to Vite. |
| `moduleResolution` | `"Bundler"` | Modern standard for tools like Vite. |
| `baseUrl` | `"."` | Prerequisite for using path aliases. |
| `paths` | `{"@framework/*": ["src/lib/live2d/framework/*"]}` | Creates a clean import alias (e.g., `import ... from '@framework/...'`). |

#### `vite.config.mts`

Configure Vite to align with the TypeScript path alias.

```typescript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // ... other config
  resolve: {
    alias: [
      { 
        find: '@framework', 
        replacement: path.resolve(__dirname, 'src/lib/live2d/framework') 
      }
    ]
  }
});
```

### Application Entrypoint Setup

#### `index.html`

Modify the main HTML file to include a `<canvas>` for rendering and a `<script>` tag for the Cubism Core library. **The core script must be loaded before your main application bundle.**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Live2D with Vite</title>
    <style>
      body { margin: 0; overflow: hidden; }
      #live2d-canvas { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <canvas id="live2d-canvas"></canvas>

    <!-- Load Cubism Core before the main app script -->
    <script src="/live2d/Core/live2dcubismcore.min.js"></script>
    
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

#### `main.ts`

The application entry point will instantiate a custom class to manage the Live2D pipeline.

```typescript
// src/main.ts
import { Live2DApplication } from './live2d-application';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('live2d-canvas') as HTMLCanvasElement;
  if (canvas) {
    new Live2DApplication(canvas);
  }
});
```

## 3. The Core Rendering Pipeline

Instead of using the official sample classes directly, a more robust approach is to encapsulate the rendering logic in a single, self-contained class.

The `Live2DApplication` class will manage:
1.  **Initialization**: Set up the WebGL context and initialize the `CubismFramework`.
2.  **Render Loop**: Use `requestAnimationFrame` for a continuous update cycle.
3.  **Model Loading**: Asynchronously fetch and parse all necessary model files (`.model3.json`, `.moc3`, textures).
4.  **Renderer and Texture Setup**: Create and configure the `CubismRenderer_WebGL` and load textures to the GPU.
5.  **Update and Draw**: In each frame of the render loop, call `model.update()` to apply physics and animations, followed by `renderer.drawModel()` to render the result.

## 4. Animation, Interaction, and Physics

### Motions and Expressions

-   **Playing Motions**: Use the `CubismMotionManager` (part of your model instance) to start animations. Motions are organized into groups (e.g., "Idle") and triggered by `model.startMotion("GroupName", index, priority)`.
-   **Priority**: A priority system (e.g., `Idle`, `Normal`, `Force`) manages which animation plays when multiple are requested. Higher priority motions interrupt lower ones.
-   **Expressions**: Facial expressions are handled similarly by the `CubismExpressionMotionManager`.

### User Interaction

-   **Gaze Following**: Capture mouse/pointer coordinates and feed them to the model's `CubismTargetPoint` manager. This translates screen position into values for parameters like `ParamAngleX` and `ParamEyeBallX`, creating a natural following motion.
-   **Hit Detection**: Models can have invisible "hit areas" defined in the Editor. Use the `model.hitTest(x, y)` method to detect clicks/taps on these areas and trigger corresponding motions.

### Physics Engine

-   **Configuration**: Physics are configured almost entirely within the Cubism Editor (e.g., hair and clothing movement). The settings are exported to a `.physics3.json` file.
-   **Runtime**: The physics simulation runs automatically. The model's `update()` method evaluates the physics for the elapsed time and applies the resulting parameter changes. Developers influence physics indirectly by changing the input parameters they are tied to (e.g., head angle).

## 5. Advanced Cubism 5 Features

### Blend Shapes

-   **SDK Perspective**: From the SDK's point of view, a Blend Shape is just another parameter with a unique ID. There is no special API for them.
-   **Runtime Control**: Control a Blend Shape by getting its ID and setting its value with `model.setParameterValueById()`, just like any other parameter.

### Parameter Controllers (IK)

-   **Editor vs. Runtime**: Parameter Controllers are an **authoring-time tool** in the Cubism Editor to help animators create complex poses (like with IK handles) more easily. They are not a runtime system.
-   **Runtime Approach**: The output of a Parameter Controller is a standard `.motion3.json` animation file. At runtime, you **play the baked animation**. There is no high-level API to manipulate the IK handle itself. To achieve dynamic IK-like behavior, you must manipulate the underlying individual parameters (`ParamArmL`, `ParamElbowL`, etc.) in your own code.

## 6. Integration with PixiJS

### The Cubism 5 Compatibility Challenge

As of late 2025, popular community wrappers like `pixi-live2d-display` **do not officially support models exported from the Cubism 5 Editor**. These libraries bundle older, incompatible versions of the Cubism Core.

### Recommended Strategy

For new projects using Cubism 5 models, the most reliable strategy is to **use the official CubismWebFramework directly** as described in this guide. This guarantees stability and access to all new features.

### DIY PixiJS Integration Blueprint

For advanced users, a custom integration is possible:

1.  **Create a custom `PIXI.Container`** that internally manages an instance of your `Live2DApplication`.
2.  Have the Live2D instance **render the model to a `PIXI.RenderTexture`** on every frame.
3.  Display this render texture in the container using a **`PIXI.Sprite`**.
4.  This allows you to apply PixiJS effects, filters, and transformations to the Live2D model as if it were a standard sprite.

## 7. Summary of Best Practices

-   **Use the Full SDK**: Always download the complete SDK from the official Live2D website to get the required `Core` engine.
-   **Encapsulate Logic**: Refactor the official sample code into a self-contained class for maintainability and easy integration.
-   **Trust the Official Framework**: For Cubism 5, rely on the official `CubismWebFramework`, as community wrappers may be outdated.
-   **Understand Editor vs. Runtime**: Know the difference between authoring-time features (like IK controllers) and runtime APIs to avoid searching for non-existent functions.
-   **Configure Your Build Tools**: Correctly set up path aliases in `tsconfig.json` and `vite.config.mts` to prevent module resolution errors.