

# **The Definitive Guide to Live2D Cubism 5 Integration with Vite and TypeScript (August 2025 Edition)**


## **Introduction**


### **The New Frontier of Web Interactivity**

The modern web has evolved beyond static pages and simple forms into a canvas for rich, dynamic, and immersive experiences. At the forefront of this evolution is Live2D Cubism 5, a technology that empowers developers to transform static 2D illustrations into fluid, expressive characters that breathe life into web applications. While widely recognized for its pivotal role in the VTuber phenomenon, the application of Live2D extends far beyond streaming avatars. Its potential is being realized in a new generation of interactive web content, including engaging educational tutorials, sophisticated AI-driven chat interfaces, and compelling narrative-driven games.<sup>1</sup> By enabling direct animation of an artist's original drawings, Live2D preserves the unique charm of 2D art while providing the dynamic expressiveness previously reserved for 3D models.<sup>2</sup>


### **Why Vite and TypeScript?**

To harness the full power of Cubism 5, a modern development stack is not just a preference but a necessity. This guide focuses on the combination of Vite and TypeScript, a pairing chosen for its performance, developer experience, and robustness. Vite offers a lightning-fast development server and an optimized build process powered by native ES modules, dramatically accelerating the development cycle.<sup>3</sup> TypeScript provides a strong type system that is indispensable for managing the complexity of a large, graphics-oriented Software Development Kit (SDK) like Live2D's. The official Live2D Web SDK itself is written in TypeScript, making this a natural and powerful combination for building stable, maintainable applications.<sup>5</sup>


### **What This Guide Will Cover**

This report serves as a definitive, practical guide to integrating Live2D Cubism 5 models into a web application using Vite and TypeScript, as of August 2025. It is designed for the intermediate-to-advanced web developer who is ready to move beyond outdated tutorials and community wrappers to master the official, modern toolset. The journey will begin with a foundational deconstruction of the Cubism 5 Web SDK, clarifying its components and architecture. It will then proceed with a step-by-step guide to architecting a production-ready project, from initial setup and build configuration to implementing a robust rendering pipeline. Finally, it will delve into advanced, Cubism 5-specific features like Blend Shapes and Parameter Controllers, providing clarity on their runtime capabilities and concluding with a strategic analysis of integration with other rendering libraries.


## **Section 1: The Anatomy of the Cubism 5 Web SDK**

Successfully integrating Live2D into a web project begins with a precise understanding of the SDK's structure and components. A common source of initial failure stems from a misunderstanding of how the SDK is packaged and distributed. The architecture deliberately separates the low-level core engine from the high-level framework, a design choice with direct implications for the developer's setup process.


### **Deconstructing the Official SDK Package**

The complete Live2D Cubism SDK for Web is composed of three primary, distinct parts, each with a specific role in bringing a model to life.<sup>6</sup>



* **Cubism Core**: This is the heart of the SDK, the high-performance engine responsible for all model calculations. It is a C library compiled to WebAssembly (.wasm) and bundled with its necessary JavaScript "glue" code (.js).<sup>7</sup> Its sole function is to take a set of parameter values (e.g., "Mouth Open/Close" at 0.8) and calculate the resulting deformed vertex positions for the model's meshes. It is entirely platform-agnostic and contains no rendering logic, no file loaders, and no animation system. It is the proprietary, closed-source component of the SDK.
* **CubismWebFramework**: This is the high-level, developer-facing API. Written in TypeScript, this framework provides the abstractions necessary to build a complete application.<sup>5</sup> It contains modules for:
    * **Rendering:** A WebGL-based renderer (CubismRenderer_WebGL) to draw the model's meshes and textures.<sup>5</sup>
    * **Model Management:** Classes for loading model settings (.model3.json) and managing the model's lifecycle.<sup>5</sup>
    * **Animation:** Managers for loading and playing motions (.motion3.json) and expressions (.exp3.json).<sup>5</sup>
    * **Physics:** A system for applying real-time physics calculations based on settings exported from the Cubism Editor.<sup>5</sup>
    * **Utilities:** A collection of helper classes for math, logging, and managing IDs.<sup>5</sup> \
 \
This framework is the primary tool a developer will interact with.
* **CubismWebSamples**: This directory contains a complete, functional sample application that demonstrates how to connect the Cubism Core and CubismWebFramework to load and display a model.<sup>9</sup> While an invaluable learning resource, its architecture is designed for demonstration rather than for direct use in a production environment, a point that will be addressed in detail later in this guide.<sup>9</sup>


### **The Critical Download: Framework Repo vs. Full SDK**

A frequent and significant hurdle for developers is the distinction between the publicly available GitHub repository and the complete SDK package. The CubismWebFramework is available as an open-source repository on GitHub, which encourages community contributions and forks.<sup>5</sup> However, this repository

**deliberately does not include the Cubism Core library**.<sup>5</sup> A developer who simply clones this repository will find it non-functional, encountering runtime errors such as

Live2DCubismCore is not defined because the essential .wasm engine is missing.<sup>8</sup>

This separation is a direct consequence of Live2D's licensing model. The open-source framework allows for broad adoption and integration, while the proprietary core engine remains under Live2D Inc.'s control, tied to a publication license agreement for commercial projects.<sup>10</sup>

To build a working application, a developer must perform the following steps:



1. Navigate to the official Live2D Cubism SDK download page.<sup>11</sup>
2. Agree to the software license agreement and download the "Live2D Cubism SDK for Web" package.
3. Unzip the package. Inside, you will find the complete and correct directory structure, including the Core, Framework, and Samples folders.<sup>6</sup> The crucial \
Core directory will contain live2dcubismcore.min.js and its associated WebAssembly file, which are required for any application to function.


### **What's New in the Cubism 5 Web SDK (as of August 2025)**

The Cubism 5 Web SDK has seen continuous development, with releases introducing new features and refining existing ones. Based on the official changelogs up to Cubism 5 SDK for Web R4, key developer-facing improvements include <sup>12</sup>:



* **Advanced Motion Looping:** The motion playback system has been enhanced to provide more natural and seamless loops. The logic was refactored, moving loop-related properties like _isLoop into the base ACubismMotion class for more consistent behavior.<sup>12</sup> This allows for animations that connect their start and end points without jarring transitions.
* **New API Callbacks and Verification:** New APIs have been added to provide more control and stability. These include a callback function that can be triggered when a motion begins playback and a utility to verify the consistency of motion3.json files, helping to catch data corruption issues early.<sup>12</sup>
* **Parameter Repeat Processing:** The SDK now supports the "Repeat" feature from the Cubism Editor. This allows a single parameter to loop its motion (e.g., for continuous rotation), a feature that previously required complex workarounds. This is available in SDK versions R4 and later.<sup>12</sup>


## **Section 2: Architecting the Vite & TypeScript Project**

With a clear understanding of the SDK's components, the next step is to construct a modern, robust project environment. This section provides a detailed, step-by-step guide to initializing a Vite and TypeScript project, integrating the Live2D SDK files, and configuring the build environment for a seamless development experience. The official Live2D samples have themselves migrated to using Vite, signaling it as a first-class, recommended tool for new projects and validating this guide's architectural approach.<sup>3</sup>


### **Step-by-Step Project Initialization**

First, create a new Vite project using the desired framework template. While this guide's code examples are framework-agnostic, a template like Vue or React provides a solid starting point.



1. Open a terminal and run the Vite creation command. For a Vue with TypeScript project, the command is: \
Bash \
npm create vite@latest my-live2d-app -- --template vue-ts \

2. Navigate into the newly created project directory and install the dependencies: \
Bash \
cd my-live2d-app \
npm install \


This process yields a standard Vite project structure, ready for customization.


### **Integrating the Live2D SDK Files**

The key to a successful integration is placing the SDK files in the correct locations within the Vite project structure so they are properly handled by the build tool and web server.



1. **Create Asset and Library Directories:**
    * Inside the public directory, create a new folder named live2d. This folder will hold all model assets (e.g., Hiyori, Mao), including their .model3.json, .moc3, texture, and motion files. Files in public are served at the root and are not processed by Vite's build pipeline, which is ideal for binary assets like .moc3 files.
    * Inside the src directory, create a lib/live2d folder structure. This will house the SDK's source code.
2. **Copy SDK Files from the Full Download:**
    * From the unzipped official SDK package, copy the entire Core directory into your project's public/live2d/ directory. The final path should be public/live2d/Core/live2dcubismcore.min.js.
    * Copy the contents of the Framework/src directory from the SDK package into your project's src/lib/live2d/framework directory. These TypeScript files will be compiled as part of your application's source code.<sup>6</sup>

The resulting project structure should look like this:

my-live2d-app/ \
├── public/ \
│   └── live2d/ \
│       ├── Core/ \
│       │   ├── live2dcubismcore.min.js \
│       │   └── live2dcubismcore.wasm \
│       └── Hiyori/ \
│           ├── Hiyori.model3.json \
│           └──... (other model assets) \
├── src/ \
│   ├── lib/ \
│   │   └── live2d/ \
│   │       └── framework/ \
│   │           ├── cubismframework.ts \
│   │           └──... (all other framework.ts files) \
│   ├── main.ts \
│   └──... (other source files) \
├── index.html \
├── package.json \
├── tsconfig.json \
└── vite.config.mts \



### **Configuring the Build Environment**

Correctly configuring Vite and TypeScript is critical to ensure that modules are resolved correctly and the SDK's source code is properly transpiled.


#### **tsconfig.json**

The TypeScript configuration needs to be updated to recognize the SDK's source files and allow for clean, aliased imports, mirroring the professional setup seen in the official samples.<sup>15</sup> This prevents deeply nested relative paths (e.g.,

../../../../) and improves code readability.


<table>
  <tr>
   <td>Compiler Option
   </td>
   <td>Value
   </td>
   <td>Rationale
   </td>
  </tr>
  <tr>
   <td>target
   </td>
   <td>"ES2022"
   </td>
   <td>Ensures modern JavaScript features are available, aligning with modern browser capabilities. A minimum of ES2020 is recommended.
   </td>
  </tr>
  <tr>
   <td>module
   </td>
   <td>"ESNext"
   </td>
   <td>Uses the latest ECMAScript module syntax, which is natively supported by Vite.
   </td>
  </tr>
  <tr>
   <td>moduleResolution
   </td>
   <td>"Bundler"
   </td>
   <td>The modern standard for tools like Vite, correctly resolving dependencies from node_modules and handling modern package formats.
   </td>
  </tr>
  <tr>
   <td>baseUrl
   </td>
   <td>"."
   </td>
   <td>Sets the base directory for non-relative module resolution. This is a prerequisite for using path aliases.
   </td>
  </tr>
  <tr>
   <td>paths
   </td>
   <td>{"@framework/*": ["src/lib/live2d/framework/*"]}
   </td>
   <td>Creates a clean import alias. Now, import { CubismFramework } from '@framework/live2dcubismframework'; can be used instead of a fragile relative path.<sup>15</sup>
   </td>
  </tr>
  <tr>
   <td>noImplicitAny
   </td>
   <td>true
   </td>
   <td>Enforces explicit typing, a best practice for large codebases and recommended by the Live2D team to improve code quality.<sup>12</sup>
   </td>
  </tr>
  <tr>
   <td>useUnknownInCatchVariables
   </td>
   <td>true
   </td>
   <td>A modern TypeScript safety feature, also recommended by Live2D, that types catch clause variables as unknown instead of any.<sup>12</sup>
   </td>
  </tr>
</table>



#### **vite.config.mts**

The Vite configuration file needs to be aligned with the TypeScript paths alias and configured for a proper development server experience.


<table>
  <tr>
   <td>Configuration Key
   </td>
   <td>Value
   </td>
   <td>Rationale
   </td>
  </tr>
  <tr>
   <td>publicDir
   </td>
   <td>"public"
   </td>
   <td>Specifies the directory for static assets. Vite will serve files from here at the project root, making /live2d/Core/live2dcubismcore.min.js accessible to index.html.<sup>14</sup>
   </td>
  </tr>
  <tr>
   <td>resolve.alias
   </td>
   <td>[{ find: '@framework', replacement: path.resolve(__dirname, 'src/lib/live2d/framework') }]
   </td>
   <td>Mirrors the paths alias in tsconfig.json, allowing Vite's resolver to understand the @framework/* import paths during the build process. This is crucial for the build to succeed.<sup>14</sup>
   </td>
  </tr>
  <tr>
   <td>server.port
   </td>
   <td>5173
   </td>
   <td>Sets a predictable port for the development server. The official samples often use port 5000.<sup>16</sup>
   </td>
  </tr>
  <tr>
   <td>server.https
   </td>
   <td>true (Optional)
   </td>
   <td>Some SDK features, like microphone access for MotionSync, may require a secure context. Enabling HTTPS for local development can be beneficial.<sup>16</sup>
   </td>
  </tr>
</table>



### **Preparing the Application Entrypoint**

Finally, the main HTML and TypeScript files must be prepared to load the SDK and mount the application.



* **index.html**: The main HTML file must be modified to include two key elements:
    1. A &lt;canvas> element where the Live2D model will be rendered.
    2. A &lt;script> tag to load the Cubism Core library. **This script must be placed before the main application bundle (&lt;script type="module" src="/src/main.ts">)**. This ensures that the Live2DCubismCore global object is available when the application's JavaScript begins to execute.<sup>6</sup>

    HTML \
&lt;!DOCTYPE **html**> \
&lt;html lang="en"> \
  &lt;head> \
    &lt;meta charset="UTF-8" /> \
    &lt;title>Live2D Cubism 5 with Vite&lt;/title> \
    &lt;style> \
      /* Basic styling to make the canvas fill the screen */ \
      body { margin: 0; overflow: hidden; } \
      #live2d-canvas { width: 100vw; height: 100vh; } \
    &lt;/style> \
  &lt;/head> \
  &lt;body> \
    &lt;canvas id="live2d-canvas">&lt;/canvas> \
 \
    &lt;script src="/live2d/Core/live2dcubismcore.min.js">&lt;/script> \
 \
    &lt;script type="module" src="/src/main.ts">&lt;/script> \
  &lt;/body> \
&lt;/html> \


* **main.ts**: The application's entry point will instantiate the main application class that will manage the Live2D rendering pipeline. This guide will develop a custom Live2DApplication class to encapsulate all logic. \
TypeScript \
// src/main.ts \
import './style.css'; \
import { Live2DApplication } from './live2d-application'; \
 \
// Ensure the DOM is fully loaded \
document.addEventListener('DOMContentLoaded', () => { \
  const canvas = document.getElementById('live2d-canvas') as HTMLCanvasElement; \
  if (canvas) { \
    new Live2DApplication(canvas); \
  } else { \
    console.error('Canvas element not found.'); \
  } \
}); \


With this architecture in place, the project is correctly configured and ready for the implementation of the core rendering logic.


## **Section 3: The Core Rendering Pipeline: A Practical Implementation**

The official CubismWebSamples provide a functional starting point, but their architecture is often not ideal for integration into larger, component-based applications. The sample code is spread across numerous LApp* classes (e.g., LAppDelegate, LAppLive2DManager, LAppModel) that rely on global state and have complex, tight coupling.<sup>15</sup> This design makes them difficult to reuse and maintain.

A more robust and professional approach involves refactoring this logic into a single, self-contained, and encapsulated class. This section details the creation of a Live2DApplication class that manages the entire rendering pipeline, from initialization to the per-frame update and draw cycle, providing a clean API for loading and managing models.


### **Step 1: Initialization and the Render Loop**

The foundation of the application is a class that initializes the necessary contexts and establishes a continuous rendering loop.

The Live2DApplication constructor will take the HTML canvas element as an argument, acquire a WebGL rendering context, and initialize the CubismFramework. It will also bind a tick method to the browser's requestAnimationFrame loop, which will serve as the application's heartbeat.


    TypeScript

// src/live2d-application.ts \
import { CubismFramework, LogLevel } from '@framework/live2dcubismframework'; \
import { LAppPal } from './lapppal'; // A utility class from the samples for time management \
 \
export class Live2DApplication { \
  private _canvas: HTMLCanvasElement; \
  private _gl: WebGLRenderingContext | null; \
 \
  constructor(canvas: HTMLCanvasElement) { \
    this._canvas = canvas; \
 \
    // Initialize WebGL Context \
    this._gl = this._canvas.getContext('webgl'); \
    if (!this._gl) { \
      throw new Error('Failed to get WebGL context'); \
    } \
 \
    // Initialize Cubism Framework \
    this.initializeCubism(); \
 \
    // Start the render loop \
    this.tick = this.tick.bind(this); \
    requestAnimationFrame(this.tick); \
  } \
 \
  private initializeCubism(): void { \
    CubismFramework.startUp({ \
      logFunction: (message: string) => console.log(message), \
      loggingLevel: LogLevel.LogLevel_Verbose \
    }); \
    CubismFramework.initialize(); \
    console.log('Cubism Framework Initialized.'); \
  } \
 \
  private tick(time: number): void { \
    LAppPal.updateTime(); // Update the internal framework clock \
 \
    // Clear the canvas \
    this._gl.clearColor(0.0, 0.0, 0.0, 0.0); // Transparent background \
    this._gl.clear(this._gl.COLOR_BUFFER_BIT); \
 \
    // TODO: Update and draw the model here \
 \
    requestAnimationFrame(this.tick); \
  } \
} \



### **Step 2: The Asynchronous Model Loading Process**

Loading a Live2D model is a multi-step, asynchronous process that involves fetching several files and orchestrating their initialization. This logic is encapsulated within a public loadModel method.

The process follows a specific sequence documented in the SDK manuals <sup>20</sup>:



1. **Fetch the Model Definition (.model3.json):** This JSON file acts as a manifest, containing relative paths to all other required assets like the .moc3 file, textures, physics, and motion definitions.<sup>20</sup>
2. **Parse the Settings:** The fetched JSON data is parsed by the CubismModelSettingJson class, which provides a convenient interface to access the asset paths.
3. **Load the Core Model (.moc3):** The .moc3 file contains the compiled model geometry and deformation data. It must be fetched as an ArrayBuffer.
4. **Revive the Moc:** The CubismMoc.create() static method takes the .moc3 buffer and "revives" it, preparing the model data within the WebAssembly memory space for use. As a best practice, the CubismMoc.hasMocConsistency() method should be used to validate the file before revival, a feature added to enhance stability.<sup>12</sup>
5. **Instantiate the Model:** Finally, a CubismUserModel is created from the CubismMoc instance. This CubismUserModel (or a class that extends it) is the primary object that the application will interact with to control parameters, play motions, and trigger updates.<sup>24</sup>

The implementation of this process requires careful handling of Promises and asynchronous operations.


### **Step 3: Setting Up Textures and the Renderer**

Once the model object is created, its renderer and textures must be initialized. The CubismRenderer_WebGL class is responsible for all drawing operations.

The setup involves <sup>20</sup>:



1. Creating an instance of CubismRenderer_WebGL and associating it with the CubismUserModel.
2. Iterating through the texture file paths provided by the CubismModelSettingJson object.
3. For each texture, loading the PNG image file using an HTMLImageElement.
4. Once an image loads, creating a WebGLTexture object, binding it, and uploading the image data to the GPU using gl.texImage2D().
5. Crucially, setting the premultipliedAlpha property correctly. Live2D models are authored with premultiplied alpha, and the WebGL context and renderer must be configured to handle it to avoid rendering artifacts like dark halos around transparent edges.
6. Binding the created WebGL texture to a texture unit number in the renderer.


### **Step 4: The Update and Draw Cycle**

With the model fully loaded and initialized, the final step is to integrate it into the requestAnimationFrame loop established in Step 1.

Inside the tick method, two essential calls are made for each loaded model on every frame:



* **model.update()**: This is the most critical method in the per-frame cycle. It orchestrates all internal updates for the model. It applies any changes to parameters, evaluates the physics simulation for the elapsed time delta, processes ongoing motions and expressions, and prepares the model's final vertex data for the current frame.<sup>20</sup>
* **renderer.drawModel()**: This method takes the updated state of the model and issues the necessary WebGL draw calls to render it to the canvas. It handles setting up the correct shaders, binding buffers, and drawing all the model's Drawable objects in the correct order.<sup>20</sup>

By encapsulating this entire pipeline within a single, well-architected class, developers can easily instantiate and manage Live2D models in any web application with a simple API call, a significant improvement over the globally-scoped, interdependent structure of the official samples.


## **Section 4: Animation, Interaction, and Physics**

A Live2D model is more than a static image; its value lies in its ability to move, react, and express emotion. The CubismWebFramework provides robust systems for managing animations, user interactions, and physics simulations. Mastering these systems is key to creating a truly "live" character.


### **Mastering Motion and Expressions**

Animations in Live2D are handled through motions and expressions, which are defined in the Cubism Editor and referenced in the .model3.json file.



* **Playing Motions:** The CubismMotionManager, a component of the CubismUserModel, is responsible for playing animations. Motions are organized into groups (e.g., "Idle", "TapBody"). To start a motion, a developer calls the startMotion method with the group name, the index of the motion within that group, and a priority level.<sup>24</sup> For example: \
model.startMotion("Idle", 0, 1);.
* **Motion Priority:** The SDK uses a priority system to manage which animation should be visible when multiple are requested. The standard priorities are Idle (low), Normal (medium), and Force (high).<sup>25</sup> A higher-priority motion will interrupt a lower-priority one. This is essential for creating responsive characters; for instance, a "tap" animation ( \
Force priority) should always play over a continuous "idle" animation (Idle priority).
* **Seamless Looping:** A significant enhancement in the Cubism 5 SDK is improved support for seamless motion looping. By configuring motions with fade-in/fade-out in the Editor and using the latest SDK, developers can create animations that loop without visual jumps or glitches. The SDK handles the blending between the end of one loop and the start of the next automatically.<sup>12</sup>
* **Managing Expressions:** Facial expressions are handled by the CubismExpressionMotionManager. Similar to motions, expressions are defined in .exp3.json files and can be triggered by calling startMotion on the expression manager, which applies the defined parameter changes to the model.<sup>12</sup>


### **Implementing User Interaction**

Creating a believable interaction model involves making the character react to the user's input. The two most common interactions are gaze following and hit detection.



* **Gaze Following:** To make the model's eyes and head follow the cursor, the application must capture the pointer's coordinates on the screen. These coordinates are then fed into the model's internal CubismTargetPoint (or a similar manager class), which translates the 2D screen position into target values for the model's core positioning parameters, such as ParamAngleX, ParamAngleY, ParamEyeBallX, and ParamEyeBallY. The model's update loop then smoothly interpolates the current parameter values towards these target values, creating a natural following motion.<sup>24</sup>
* **Hit Detection:** Models can be configured with invisible "hit areas" in the Cubism Editor, which are exported as part of the model data. These are typically defined for areas like the head, body, or arms. The CubismUserModel provides a hitTest method that takes screen coordinates as input and returns the name of the hit area that was struck, if any. The application can listen for pointer events (like clicks or taps), call the hitTest method, and if a specific area like "Head" is returned, it can trigger a corresponding motion (e.g., model.startMotion("TapHead", 0, 3);).<sup>24</sup>


### **Leveraging the Physics Engine**

The physics system adds another layer of realism, automatically animating parts of the model like hair, clothing, and accessories in response to movement.



* **Authoring-Time Configuration:** It is critical to understand that the physics simulation is almost entirely configured within the Cubism Editor. The artist sets up pendulum chains, associates them with input parameters (like head angle), and tunes properties like shakiness and convergence speed. These settings are exported into a .physics3.json file, which is then loaded by the framework.<sup>22</sup>
* **Runtime Evaluation:** From the developer's perspective, the physics system is largely a "black box" that operates automatically. The CubismPhysics instance is created and managed internally by the CubismUserModel upon loading. The model's main update() method is responsible for evaluating the physics simulation for the elapsed time, calculating the resulting parameter changes for the swinging parts, and applying them before rendering.<sup>5</sup> There are no high-level APIs in the Web SDK for dynamically changing physics properties like "stiffness" at runtime. Instead, the developer influences the physics simulation indirectly by changing the input parameters the physics are tied to. For example, by changing \
ParamAngleX, the developer provides the input that causes the hair physics to react.
* **Frame Rate Consistency:** The Cubism Editor includes a "Calculate FPS" setting within the physics editor. It is important that this value matches the target frame rate of the web application (typically 60 FPS). A mismatch can cause the physics to appear faster or slower than intended.<sup>29</sup>


## **Section 5: Advanced Techniques: Harnessing New Cubism 5 Features**

Live2D Cubism 5 introduced powerful new features in its Editor to enhance artistic expression and streamline animation workflows. However, a gap often exists between what is possible in the Editor and what is directly controllable via the SDK at runtime. This section provides a developer-focused clarification on two of the most significant new features: Blend Shapes and Parameter Controllers (IK), detailing how they can be leveraged in a web application.


### **A Developer's Guide to Blend Shapes**

Blend Shapes are a powerful modeling feature that allows an artist to create complex deformations by additively blending different shapes together. This is useful for creating nuanced facial expressions or other effects that are difficult to achieve by combining standard deformation parameters.<sup>31</sup>



* **The SDK Perspective:** While Blend Shapes are a distinct concept in the Editor, from the Web SDK's point of view, **a Blend Shape is simply another parameter**. It is exported with a unique ID, just like ParamAngleX or ParamMouthOpen.<sup>33</sup> The SDK does not have a separate or special API, such as \
model.setBlendShapeValue(). All manipulations are done through the standard parameter control functions.
* **Practical Runtime Control:** To control a Blend Shape at runtime, a developer uses the exact same methods as for any other parameter. The process involves:
    1. Obtaining the ID for the Blend Shape parameter (e.g., ParamCheekPuff). This ID is defined by the artist in the Cubism Editor.
    2. Using the CubismModel.setParameterValueById() method to set its value. Blend Shape parameters are typically designed to operate on a 0 to 1 scale.<sup>31</sup>

The following code demonstrates how to control a "cheek puff" Blend Shape in real-time:TypeScript \
// Assuming 'model' is an initialized CubismUserModel instance \
// and 'puffValue' is a number between 0 and 1 from a UI slider. \
 \
const cheekPuffId = CubismFramework.getIdManager().getId('ParamCheekPuff'); \
model.setParameterValueById(cheekPuffId, puffValue); \
This direct control allows for dynamic, code-driven expressions that go beyond pre-canned animations.


### **Runtime Control of Parameter Controllers (IK)**

The Parameter Controller feature, introduced in Cubism Editor 5.2, is a revolutionary tool for animators. It allows them to set up on-screen controls (gizmos) that function like Inverse Kinematics (IK) handles, manipulating multiple underlying parameters at once to easily pose complex parts like arms or legs.<sup>35</sup> This raises a critical question for developers: can these IK handles be controlled at runtime via the SDK?



* **The Editor-Runtime Distinction:** The research indicates that Parameter Controllers are primarily an **authoring-time tool**, not a runtime system. Their purpose is to dramatically accelerate the process of creating animations within the Editor. The settings for these controllers are saved in a .paramctrl3.json file <sup>22</sup>, but there is no evidence of a high-level API in the Web SDK to manipulate the controller itself (e.g., by setting the position of the IK handle).<sup>5</sup>
* **The Correct Runtime Approach:** The output of using a Parameter Controller in the Editor is a standard .motion3.json animation file. The controller helps the animator create the keyframes for this animation more efficiently. At runtime, the developer's role is to **play the baked animation** that was created using the controller. The SDK will play this motion file just like any other.
* **Alternative: Direct Parameter Manipulation:** While the high-level IK handle is not exposed, a developer can still achieve similar programmatic control by manipulating the individual parameters that the controller was linked to. For example, an IK controller for an arm might manipulate ParamArmL, ParamElbowL, and ParamWristL. A developer can write code to calculate the desired values for these parameters and set them individually using setParameterValueById, effectively recreating the IK logic in their own application code. This is more complex but offers the ultimate level of dynamic control.

Clarifying this distinction is crucial. It prevents developers from spending time searching for a non-existent model.setIkHandlePosition() API and instead directs them toward the correct methods for achieving their goals: either by playing pre-baked animations or by controlling the underlying parameters directly.


## **Section 6: Integration Pathways: The PixiJS Case Study**

While the official CubismWebFramework is powerful and complete, many developers are drawn to higher-level rendering libraries like PixiJS for their rich ecosystems, simplified APIs, and extensive feature sets (filters, particle effects, UI components).<sup>38</sup> Community-driven wrappers, most notably

pixi-live2d-display, have historically been a popular way to bridge the gap, abstracting away the boilerplate of the official SDK.<sup>26</sup> However, with the release of Cubism 5, this approach faces a significant challenge.


### **The Cubism 5 Compatibility Challenge**

A critical finding of this report is that, as of August 2025, the popular pixi-live2d-display library and its known forks **do not officially support models exported from Cubism 5**.<sup>26</sup> These libraries were built for Cubism 2.1 and Cubism 4, and they bundle older versions of the

Cubism Core and CubismWebFramework. Attempting to load a model created with the Cubism 5 Editor will result in failure because the underlying engine is incompatible with the new .moc3 format and features.<sup>41</sup>

This incompatibility stems from the significant effort required to update these community-maintained wrappers. Major SDK updates from Live2D can introduce breaking changes to the core APIs, and the maintainers of these libraries, often working on them as passion projects, may not have the resources to keep pace with official releases.<sup>12</sup> This creates a time lag where the most popular and well-documented community tools are incompatible with the latest version of the authoring software, leaving developers in a knowledge vacuum.


### **Recommended Strategy for Production**

Given the current state of the ecosystem, the most reliable and future-proof strategy for any new project utilizing Cubism 5 models is to **use the official CubismWebFramework directly**, as detailed in the preceding sections of this guide. This is the only path that guarantees stability, access to all Cubism 5 features, and alignment with the official development roadmap.


### **For the Expert: A DIY Integration Blueprint**

For advanced developers who have a strong requirement to integrate Live2D into a PixiJS v8+ application, a "Do-It-Yourself" approach is possible, though complex. This involves creating a custom PixiJS object that wraps the official Live2D rendering pipeline.

A conceptual blueprint for this integration would be:



1. **Create a Custom PixiJS Container:** Develop a new class, PixiLive2DModel, that extends PIXI.Container.
2. **Internal Live2D Instance:** The constructor of this class would instantiate the Live2DApplication (or a similar self-contained wrapper) detailed in Section 3, using a hidden canvas or an offscreen render target.
3. **Render to Texture:** The most straightforward integration method is to have the internal Live2D instance render the model to a PIXI.RenderTexture on every frame.
4. **Display as a Sprite:** A PIXI.Sprite would then be added as a child to the PixiLive2DModel container, with its texture set to the PIXI.RenderTexture.
5. **Override _render:** The PixiLive2DModel class would override Pixi's internal _render method. Inside this method, it would first call the internal Live2D instance's update and draw methods to update the render texture, and then call the parent _render method to draw the sprite onto the main stage.

This approach effectively uses the official, up-to-date Live2D renderer to draw the model onto a texture, and then leverages PixiJS's powerful rendering engine to composite that texture into the main scene. This allows the developer to apply PixiJS filters, transformations, and blend modes to the Live2D model as if it were a standard sprite, providing the best of both worlds at the cost of increased implementation complexity.


## **Conclusion: Best Practices and Future Outlook**

The integration of Live2D Cubism 5 into a modern web stack represents a significant step forward for interactive character-driven experiences online. By leveraging the performance of Vite and the robustness of TypeScript, developers can build applications that are both highly engaging and maintainable. This guide has provided a definitive pathway for this integration, moving beyond outdated methods to establish a new set of best practices for 2025 and beyond.


### **Summary of Best Practices**

A successful and frustration-free development experience with the Cubism 5 Web SDK hinges on adhering to a few core principles:



* **Begin with the Complete SDK:** Always start by downloading the full SDK package from the official Live2D website. Relying solely on the CubismWebFramework GitHub repository will lead to immediate failure due to the missing Cubism Core engine.
* **Embrace Modular Architecture:** Avoid using the official LApp* sample classes directly in a production application. Instead, refactor the core logic into a self-contained, encapsulated class that manages the entire pipeline from initialization to rendering. This creates a reusable and maintainable component that can be easily integrated into any application framework.
* **Trust the Official Framework:** For any project using Cubism 5 models, the official CubismWebFramework is the only guaranteed path to stability and full feature support. Community wrappers, while historically popular, currently lag behind and are incompatible.
* **Delineate Editor and Runtime:** Understand the critical distinction between authoring-time features in the Cubism Editor (like Parameter Controllers) and the APIs available for runtime control in the SDK. This knowledge prevents wasted effort searching for non-existent APIs and focuses development on what is practically achievable.
* **Meticulous Configuration:** Pay close attention to the configuration of your build tools. Correctly setting up vite.config.mts and tsconfig.json with the proper path aliases and compiler options is fundamental to a working project and prevents a wide range of common compilation and module resolution errors.


### **Future Outlook**

The landscape of real-time 2D rendering on the web is continuously evolving. Looking ahead, several trends are likely to shape the future of Live2D development. The increasing prominence of WebAssembly for high-performance web applications validates Live2D's choice to build its core engine on this technology. We may see the Live2D team release official high-level components for popular frameworks like React or Vue, further simplifying integration. Concurrently, the dedicated community behind libraries like pixi-live2d-display will likely, in time, update their projects to support Cubism 5, once again providing valuable abstractions for the ecosystem.

By mastering the official toolset as detailed in this guide, developers are not only equipped to build cutting-edge applications today but are also perfectly positioned to adapt and thrive as the ecosystem matures. The creative potential unlocked by this powerful technology is immense, and the path to harnessing it is now clearer than ever.


#### Works cited



1. Live2D Cubism | See your creation come to life. Software that directly animates your original drawings., accessed August 11, 2025, [https://www.live2d.com/en/](https://www.live2d.com/en/)
2. Live2D Cubism Editor, accessed August 11, 2025, [https://www.live2d.com/en/cubism/about/](https://www.live2d.com/en/cubism/about/)
3. CubismWebSamples/Samples/TypeScript/README.md at develop · Live2D ... - GitHub, accessed August 11, 2025, [https://github.com/Live2D/CubismWebSamples/blob/develop/Samples/TypeScript/README.md](https://github.com/Live2D/CubismWebSamples/blob/develop/Samples/TypeScript/README.md)
4. Build Web Samples | SDK Tutorial - Live2D Cubism, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-sdk-tutorials/sample-build-web/](https://docs.live2d.com/en/cubism-sdk-tutorials/sample-build-web/)
5. Live2D/CubismWebFramework - GitHub, accessed August 11, 2025, [https://github.com/Live2D/CubismWebFramework](https://github.com/Live2D/CubismWebFramework)
6. Live2D on the Web (Part 1): How to Load a Live2D Model in Your Vue.js Project - Medium, accessed August 11, 2025, [https://medium.com/@mizutori/live2d-on-the-web-part-1-how-to-load-a-live2d-model-in-your-vue-js-project-2f3987ceb91f](https://medium.com/@mizutori/live2d-on-the-web-part-1-how-to-load-a-live2d-model-in-your-vue-js-project-2f3987ceb91f)
7. Cubism Core API Reference | SDK Manual | Live2D Manuals & Tutorials, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-sdk-manual/cubism-core-api-reference/](https://docs.live2d.com/en/cubism-sdk-manual/cubism-core-api-reference/)
8. Where the heck is live2dcubismcore.wasm supposed to come from? Not in SDK download? : r/Live2D - Reddit, accessed August 11, 2025, [https://www.reddit.com/r/Live2D/comments/1m2wu3v/where_the_heck_is_live2dcubismcorewasm_supposed/](https://www.reddit.com/r/Live2D/comments/1m2wu3v/where_the_heck_is_live2dcubismcorewasm_supposed/)
9. Live2D/CubismWebSamples - GitHub, accessed August 11, 2025, [https://github.com/Live2D/CubismWebSamples](https://github.com/Live2D/CubismWebSamples)
10. Live2D Cubism SDK, accessed August 11, 2025, [https://www.live2d.com/en/sdk/about/](https://www.live2d.com/en/sdk/about/)
11. Download Live2D Cubism SDK for Web, accessed August 11, 2025, [https://www.live2d.com/en/sdk/download/web/](https://www.live2d.com/en/sdk/download/web/)
12. Releases · Live2D/CubismWebFramework - GitHub, accessed August 11, 2025, [https://github.com/Live2D/CubismWebFramework/releases](https://github.com/Live2D/CubismWebFramework/releases)
13. Repeat | Editor Manual - Live2D Cubism, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-editor-manual/repeat/](https://docs.live2d.com/en/cubism-editor-manual/repeat/)
14. Using SDK for Web from JavaScript in Vite projects | SDK Tutorial ..., accessed August 11, 2025, [https://docs.live2d.com/en/cubism-sdk-tutorials/use-sdk-in-js/](https://docs.live2d.com/en/cubism-sdk-tutorials/use-sdk-in-js/)
15. CubismWebSamples/Samples/TypeScript/Demo/src/lappmodel.ts at develop - GitHub, accessed August 11, 2025, [https://github.com/Live2D/CubismWebSamples/blob/develop/Samples/TypeScript/Demo/src/lappmodel.ts](https://github.com/Live2D/CubismWebSamples/blob/develop/Samples/TypeScript/Demo/src/lappmodel.ts)
16. Live2D/CubismWebMotionSyncComponents - GitHub, accessed August 11, 2025, [https://github.com/Live2D/CubismWebMotionSyncComponents](https://github.com/Live2D/CubismWebMotionSyncComponents)
17. How to Deploy a Live2D Web App Using Heroku - freeCodeCamp, accessed August 11, 2025, [https://www.freecodecamp.org/news/how-to-deploy-a-live2d-web-app-using-heroku/](https://www.freecodecamp.org/news/how-to-deploy-a-live2d-web-app-using-heroku/)
18. pixi-live2d-display Basic - CodePen, accessed August 11, 2025, [https://codepen.io/guansss/pen/oNzoNoz/left?editors=1010](https://codepen.io/guansss/pen/oNzoNoz/left?editors=1010)
19. CHANGELOG.md - Live2D/CubismNativeSamples - GitHub, accessed August 11, 2025, [https://github.com/Live2D/CubismNativeSamples/blob/develop/CHANGELOG.md](https://github.com/Live2D/CubismNativeSamples/blob/develop/CHANGELOG.md)
20. About Models (Web) | SDK Manual - Live2D Cubism, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-sdk-manual/model-web/](https://docs.live2d.com/en/cubism-sdk-manual/model-web/)
21. How to Use CubismWebFramework Directly | SDK Manual - Live2D Cubism, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-sdk-manual/use-framework-web/](https://docs.live2d.com/en/cubism-sdk-manual/use-framework-web/)
22. File Types and Extensions | Editor Manual - Live2D Cubism, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-editor-manual/file-type-and-extension/](https://docs.live2d.com/en/cubism-editor-manual/file-type-and-extension/)
23. Releases · Live2D/CubismWebSamples - GitHub, accessed August 11, 2025, [https://github.com/Live2D/CubismWebSamples/releases](https://github.com/Live2D/CubismWebSamples/releases)
24. CubismWebFramework/src/model/cubismusermodel.ts at develop - GitHub, accessed August 11, 2025, [https://github.com/Live2D/CubismWebFramework/blob/develop/src/model/cubismusermodel.ts](https://github.com/Live2D/CubismWebFramework/blob/develop/src/model/cubismusermodel.ts)
25. Motions and Expressions - pixi-live2d-display, accessed August 11, 2025, [https://guansss.github.io/pixi-live2d-display/motions_expressions/](https://guansss.github.io/pixi-live2d-display/motions_expressions/)
26. pixi-live2d-display-lipsyncpatch - NPM, accessed August 11, 2025, [https://www.npmjs.com/package/pixi-live2d-display-lipsyncpatch](https://www.npmjs.com/package/pixi-live2d-display-lipsyncpatch)
27. Loop editing support | Editor Manual - Live2D Cubism, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-editor-manual/loop-editing-support/](https://docs.live2d.com/en/cubism-editor-manual/loop-editing-support/)
28. Enable Fade and Loop Motion (CubismMotionController) | SDK Tutorial - Live2D Cubism, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-sdk-tutorials/loop-playback-with-fade-cubism/](https://docs.live2d.com/en/cubism-sdk-tutorials/loop-playback-with-fade-cubism/)
29. About Physics | Editor Manual - Live2D Cubism, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-editor-manual/physics-operation/](https://docs.live2d.com/en/cubism-editor-manual/physics-operation/)
30. How to Set Up Physics | Editor Manual - Live2D Cubism, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-editor-manual/physical-operation-setting/](https://docs.live2d.com/en/cubism-editor-manual/physical-operation-setting/)
31. Blend Shape | Editor Manual - Live2D Cubism, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-editor-manual/blend-shape/](https://docs.live2d.com/en/cubism-editor-manual/blend-shape/)
32. SDK Support for New Features in Cubism 5 | SDK Manual | Live2D Manuals & Tutorials, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-sdk-manual/cubism-5-new-functions/](https://docs.live2d.com/en/cubism-sdk-manual/cubism-5-new-functions/)
33. Compare Features – Live2D Cubism FREE vs PRO, accessed August 11, 2025, [https://www.live2d.com/en/cubism/comparison/](https://www.live2d.com/en/cubism/comparison/)
34. SDK Compatibility with Cubism 5 Features | SDK Manual | Live2D Manuals & Tutorials, accessed August 11, 2025, [https://docs.live2d.com/en/cubism-sdk-manual/compatibility-with-cubism-5/](https://docs.live2d.com/en/cubism-sdk-manual/compatibility-with-cubism-5/)
35. Live2D Cubism Editor 最新アップデート情報, accessed August 11, 2025, [https://www.live2d.com/en/cubism/update/](https://www.live2d.com/en/cubism/update/)
36. 【official】Cubism 5 2 beta1 New Features Digest - YouTube, accessed August 11, 2025, [https://www.youtube.com/watch?v=CNw88idQb2g](https://www.youtube.com/watch?v=CNw88idQb2g)
37. 5.2.00 Update Information - Live2D Cubism, accessed August 11, 2025, [https://www.live2d.com/en/cubism/update/5-2-00-update-information/](https://www.live2d.com/en/cubism/update/5-2-00-update-information/)
38. Ecosystem - PixiJS, accessed August 11, 2025, [https://pixijs.com/8.x/guides/getting-started/ecosystem](https://pixijs.com/8.x/guides/getting-started/ecosystem)
39. sujoyu/pixi-live2d-display - NPM, accessed August 11, 2025, [https://www.npmjs.com/package/@sujoyu/pixi-live2d-display](https://www.npmjs.com/package/@sujoyu/pixi-live2d-display)
40. guansss/pixi-live2d-display: A PixiJS plugin to display Live2D models of any kind. - GitHub, accessed August 11, 2025, [https://github.com/guansss/pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)
41. Live2D Settings - AITuberKit, accessed August 11, 2025, [https://docs.aituberkit.com/en/guide/character/live2d](https://docs.aituberkit.com/en/guide/character/live2d)