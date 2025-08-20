

# **From Legacy to Leading-Edge: A Comprehensive Migration Guide to the Google Gen AI JavaScript SDK (@google/genai)**

The generative AI landscape is evolving at an unprecedented pace, and with it, the tools and libraries that developers rely on to build innovative applications. Google's Gemini family of models has opened up new frontiers in multimodal interaction, and the Software Development Kits (SDKs) used to access them have matured accordingly. This evolution has led to a crucial transition point for the JavaScript and TypeScript community: the move from the original @google/generative-ai package to the new, unified Google Gen AI SDK, @google/genai.

This guide serves as the definitive resource for navigating this migration. Its purpose is to provide a clear, comprehensive, and practical path from the legacy SDK to its powerful successor. This transition is more than a simple version update; it is a strategic upgrade to a more robust, consistent, and future-proof platform. The new @google/genai SDK has been architected from the ground up to serve as a single, streamlined interface for Google's entire suite of generative models—including Gemini, the image generation capabilities of Imagen, and the video generation models of Veo.<sup>1</sup>

By migrating, developers unlock access to cutting-edge features such as the low-latency, bidirectional Live API, a more intuitive and organized developer experience, and unified access to both the Gemini Developer API and the enterprise-grade Vertex AI platform.<sup>3</sup> This document will demystify the changes, provide side-by-side code comparisons, and empower development teams to confidently upgrade their applications, ensuring they are built on a foundation ready for the future of generative AI.


## **The Crossroads of SDKs: Clarifying @google/generative-ai vs. @google/genai**

The first and most critical step in any migration is understanding the landscape. The existence of two similarly named NPM packages, @google/generative-ai and @google/genai, has been a significant source of confusion for developers and even for AI assistants trained on older data. This section provides an unambiguous resolution to this confusion and explains the fundamental reasons behind the transition.


### **The Definitive Answer: @google/genai is the Path Forward**

To be unequivocally clear: **@google/genai** is the new, official, and actively maintained SDK for all current and future development with the Gemini API and other Google generative models.<sup>4</sup> The package

**@google/generative-ai** is the legacy, deprecated library.

Any new project should exclusively use @google/genai. Any existing project using @google/generative-ai should plan for migration. The official documentation, quickstart guides, and examples from Google now all use the new @google/genai SDK.<sup>1</sup> This is not merely a recommendation but a necessary step to maintain access to the latest features, performance improvements, and security updates.

The similarity in naming is an unfortunate but common byproduct of rapid product iteration in the technology sector. The initial SDK was released to provide immediate access to the first versions of Gemini. As the platform's vision expanded, a new, more scalable SDK was required, leading to the creation of @google/genai. This guide is designed to be the definitive resource to cut through the noise and provide a clear path.


### **The Deprecation Roadmap and Rationale**

The deprecation of the @google/generative-ai package is not immediate but has a firm timeline that developers must be aware of. According to official Google documentation, all support for the legacy library, including critical bug fixes and security patches, will end in **late September 2025**.<sup>4</sup> The package's page on NPM and its GitHub repository specify a slightly earlier date of

**August 31st, 2025**.<sup>1</sup> To ensure a safe and timely transition, development teams should plan their migration efforts to be completed before the earlier August 2025 deadline. After this point, the feature gap between the two libraries will widen, and applications remaining on the legacy package will be exposed to potential unpatched vulnerabilities.

The rationale for this change is strategic and architectural. The deprecation is not a simple version bump but a necessary evolution to support a broader vision. The original @google/generative-ai SDK was a tactical release, designed specifically for the initial launch of the Gemini API. The new @google/genai SDK, however, is a strategic, long-term platform. It was created to provide a single, unified interface for a much wider ecosystem of models (Gemini, Imagen, Veo) and deployment targets (the developer-focused Gemini API and the enterprise-grade Vertex AI platform).<sup>1</sup>

This shift reflects a maturation of Google's generative AI strategy. Where the old SDK represented a silo for a single API, the new SDK acts as a central hub for all of Google's generative AI offerings. Remaining on the legacy package effectively isolates a project in a technical cul-de-sac, cutting it off from future innovations and models that will only be supported in the new SDK.<sup>4</sup>


### **The Broader Ecosystem: Contextualizing LangChain, Vercel AI SDK, and More**

Developers operate within a rich ecosystem of tools, and it is important to understand how the official Google SDK fits in. Popular libraries like @langchain/google-genai <sup>9</sup> and the Vercel-developed

@ai-sdk/google <sup>11</sup> are not replacements for the official SDK but rather powerful abstraction layers built on top of it.

These toolkits provide higher-level APIs and integrations designed to accelerate development for specific use cases, such as building complex agentic workflows with LangChain or creating chat UIs with the Vercel AI SDK. They often use @google/genai as a dependency under the hood to handle the direct communication with Google's APIs.

Therefore, a solid understanding of the foundational @google/genai SDK remains essential, even when using these frameworks. This knowledge is invaluable for several reasons:



* **Deeper Debugging:** When issues arise, the ability to trace them down to the underlying SDK calls is crucial.
* **Direct Feature Access:** New features, such as the Live API or advanced model configuration options, will always appear in the official @google/genai SDK first, before they are integrated into higher-level abstractions.
* **Understanding Capabilities:** Knowing the core SDK's capabilities and limitations allows developers to make more informed architectural decisions and understand what is and isn't possible with the underlying platform.


### **Table 1: JavaScript SDK Quick Reference**

To distill the most critical information into a scannable format, the following table serves as a quick reference for the two packages. A developer can glance at this table and get all the essential links, status information, and dates needed to make the correct choice.


<table>
  <tr>
   <td>Package Name
   </td>
   <td>NPM Link
   </td>
   <td>GitHub Repository
   </td>
   <td>Status
   </td>
   <td>Support Ends
   </td>
  </tr>
  <tr>
   <td>@google/genai
   </td>
   <td><a href="https://www.npmjs.com/package/@google/genai">npmjs.com/package/@google/genai</a>
   </td>
   <td><a href="https://github.com/googleapis/js-genai">googleapis/js-genai</a>
   </td>
   <td><strong>Active & Recommended</strong>
   </td>
   <td>N/A
   </td>
  </tr>
  <tr>
   <td>@google/generative-ai
   </td>
   <td><a href="https://www.npmjs.com/package/@google/generative-ai">npmjs.com/package/@google/generative-ai</a>
   </td>
   <td><a href="https://github.com/google-gemini/deprecated-generative-ai-js">google-gemini/deprecated-generative-ai-js</a>
   </td>
   <td><strong>Deprecated</strong>
   </td>
   <td>August 31, 2025
   </td>
  </tr>
</table>


Data compiled from sources.<sup>1</sup>


## **Foundational Migration: Setup, Authentication, and Initialization**

With a clear understanding of which package to use and why, the next step is the practical, hands-on process of migrating the foundational code. This involves updating project dependencies and, most importantly, adapting to the new architectural pattern for initializing and authenticating the SDK client.


### **Updating Dependencies**

The first code-level change is to update the project's dependencies in the package.json file. This involves removing the old package and installing the new one.

First, uninstall the legacy package:


    Bash

npm uninstall @google/generative-ai \


Next, install the new, official SDK:


    Bash

npm install @google/genai \


Source: <sup>4</sup>

It is also important to ensure the development environment meets the prerequisites. The new SDK requires a modern version of Node.js, typically version 18 or later, with version 20 or the latest Long-Term Support (LTS) version being recommended for best performance and compatibility.<sup>5</sup>


### **The Central GoogleGenAI Client: A New Architectural Pattern**

The most significant structural change between the legacy and new SDKs is the shift in how the API client is instantiated and used. This change reflects a move from a model-centric architecture to a more scalable, service-oriented architecture.

In the old @google/generative-ai SDK, the GoogleGenerativeAI class primarily acted as a factory. Its main purpose was to create GenerativeModel instances using the getGenerativeModel() method. Core functionalities like chat were then initiated as methods on these model objects themselves. Furthermore, accessing other services, such as file management for multimodal prompts or content caching, required importing and instantiating entirely separate client classes, leading to scattered configuration and boilerplate code.<sup>14</sup>

The new @google/genai SDK introduces a much cleaner and more organized pattern. The GoogleGenAI class is now the single, central client instance for an application. All API functionality is accessed through a consistent set of namespaced submodules on this client instance. This creates a highly discoverable and logical API surface:



* ai.models: For all model-related interactions like generating content or counting tokens.
* ai.chats: For creating and managing stateful, multi-turn chat sessions.
* ai.files: For uploading and managing files used in multimodal prompts.
* ai.live: For establishing real-time, bidirectional WebSocket connections.
* ai.caches: For managing cached content to reduce latency and cost.

Source: <sup>5</sup>

This architectural shift from a model-centric to a service-oriented design has direct and positive implications for code structure. A developer's mental model must adapt. Instead of thinking, "I need to get a model object to start a chat," the new paradigm is, "I need the central AI client, and from there, I will access the chat service." This is a far more scalable pattern that allows Google to seamlessly add new top-level services in the future (for example, for new models like Veo or Imagen) without cluttering the main class or requiring developers to import yet another client. Understanding this logic helps developers write more idiomatic, maintainable, and forward-compatible code with the new SDK.


### **Authentication and Configuration: Side-by-Side**

The new unified client architecture dramatically simplifies authentication and configuration, especially for developers whose applications need to bridge the gap between prototyping and production. The following side-by-side examples illustrate the changes for the two primary authentication methods.


#### **Gemini Developer API (API Key)**

This method is common for quickstarts, tutorials, and initial development, using a free API key generated from Google AI Studio.<sup>5</sup>

Before (@google/generative-ai)

Authentication was straightforward: the API key was passed directly to the constructor.


    JavaScript

// Old SDK: @google/generative-ai \
// The API key is passed directly during instantiation. \
 \
const { GoogleGenerativeAI } = require("@google/generative-ai"); \
 \
// The API key is a required argument for the constructor. \
const genAI = new GoogleGenerativeAI("YOUR_API_KEY"); \


Source: <sup>15</sup>

After (@google/genai)

The new SDK accepts the API key within a configuration object. It also offers the convenience of automatically detecting the key from standard environment variables, reducing the need to hardcode credentials in the initialization logic.


    JavaScript

// New SDK: @google/genai \
// The API key is passed in a configuration object. \
 \
const { GoogleGenAI } = require("@google/genai"); \
 \
// Option 1: Pass the key explicitly in the config object. \
const ai = new GoogleGenAI({apiKey: "YOUR_API_KEY"}); \
 \
// Option 2 (Recommended): Set an environment variable and initialize without arguments. \
// The SDK will automatically look for GOOGLE_API_KEY or GEMINI_API_KEY. \
// In your shell: export GOOGLE_API_KEY="YOUR_API_KEY" \
const ai_env = new GoogleGenAI({}); \


Source: <sup>5</sup>


#### **Vertex AI (Google Cloud Project)**

This method is used for production applications that require the enterprise-grade security, governance, and MLOps features of Google Cloud's Vertex AI platform.<sup>3</sup>

Before (@google/generative-ai)

The legacy @google/generative-ai SDK did not have clear, built-in support for Vertex AI authentication. Developers building on Vertex AI typically had to use an entirely different library, such as google-cloud-aiplatform, which created a significant migration hurdle when moving an application from prototype to production.8 This guide focuses on the JS SDK migration, and for users in that ecosystem, there was no direct, simple path within the old package.

After (@google/genai)

The new SDK was explicitly designed to solve this problem, providing seamless, built-in support for Vertex AI. The transition from using a developer API key to using Google Cloud project-based authentication is now a simple change in the initialization block.


    JavaScript

// New SDK: @google/genai \
// Vertex AI configuration is a first-class citizen. \
 \
const { GoogleGenAI } = require("@google/genai"); \
 \
// Option 1: Pass Vertex AI project details explicitly. \
// This requires Application Default Credentials (ADC) to be configured, \
// e.g., by running `gcloud auth application-default login`. \
const ai_vertex_explicit = new GoogleGenAI({ \
  vertexai: true, \
  project: 'your-gcp-project-id', \
  location: 'us-central1', \
}); \
 \
// Option 2 (Recommended for Vertex AI environments): Use environment variables. \
// In your shell: \
// export GOOGLE_GENAI_USE_VERTEXAI=true \
// export GOOGLE_CLOUD_PROJECT='your-gcp-project-id' \
// export GOOGLE_CLOUD_LOCATION='us-central1' \
const ai_vertex_env = new GoogleGenAI({}); \


Source: <sup>13</sup>

This streamlined developer-to-enterprise workflow is a cornerstone benefit of migrating. The ability to move an application from a simple, API-key-based prototype to a fully-fledged Vertex AI deployment by changing only the initialization code is a massive improvement that reduces friction and accelerates production timelines.<sup>3</sup>


## **Migrating Core Functionality: From Single Prompts to Stateful Chat**

With the SDK set up and initialized, the next step is to migrate the application's core logic. This section provides direct, side-by-side code translations for the most common use cases: single-turn content generation and multi-turn, stateful conversations.


### **Single-Turn Generation (generateContent)**

This is the most fundamental interaction with a large language model: sending a single prompt and receiving a single response. The migration here highlights the new SDK's more functional and stateless approach.

Before (@google/generative-ai)

The process involved getting a GenerativeModel instance and then calling generateContent on that instance. Accessing the final text response required navigating through a nested response object.


    JavaScript

// Old SDK: @google/generative-ai \
 \
const { GoogleGenerativeAI } = require("@google/generative-ai"); \
const genAI = new GoogleGenerativeAI(process.env.API_KEY); \
 \
// 1. Get a model instance first, tying the object to a specific model. \
const model = genAI.getGenerativeModel({ model: "gemini-pro" }); \
 \
async function run() { \
  const prompt = "Explain the importance of the open-source movement in 50 words."; \
   \
  // 2. Call generateContent on the model instance. \
  const result = await model.generateContent(prompt); \
   \
  // 3. Await the nested response object. \
  const response = await result.response; \
   \
  // 4. Call the text() method to get the final string. \
  console.log(response.text()); \
} \
 \
run(); \


Source: Reconstructed from documentation patterns in <sup>18</sup>

After (@google/genai)

The new SDK uses the central client's models service. The model name is passed as a parameter in each request, and the response object is flatter, providing more direct access to the generated text.


    JavaScript

// New SDK: @google/genai \
 \
const { GoogleGenAI } = require("@google/genai"); \
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY}); \
 \
async function run() { \
  // 1. Call generateContent directly on the `ai.models` service. \
  // The model name is a parameter of the request, not tied to an object. \
  const response = await ai.models.generateContent({ \
    model: "gemini-1.5-flash", \
    contents: "Explain the importance of the open-source movement in 50 words.", \
  }); \
 \
  // 2. Access the generated text directly from the `text` property. \
  console.log(response.text); \
} \
 \
run(); \


Source: <sup>6</sup>

The design of the new API is more stateless and functional. The legacy model object was stateful, at least concerning the model name it represented. The new ai.models service, by contrast, is entirely stateless. This is a subtle but powerful design choice. It means a single ai client instance can be used to make sequential calls to different models—for example, gemini-1.5-flash for a quick summary, followed by gemini-1.5-pro for a complex reasoning task, and then a call to an imagen model for image generation—all without the boilerplate of creating and managing multiple model objects. This simplifies application logic and enhances flexibility.


### **Rebuilding Conversations: The Chat API**

For any chatbot or conversational agent, migrating the chat logic is a critical task. The new SDK elevates chat from a method on a model to a dedicated, first-class service, signaling a more robust approach to session management.

Before (@google/generative-ai)

A chat session was initiated by calling the startChat() method on a specific GenerativeModel instance. The returned chat object then managed the conversation history implicitly.


    JavaScript

// Old SDK: @google/generative-ai \
 \
const { GoogleGenerativeAI } = require("@google/generative-ai"); \
const genAI = new GoogleGenerativeAI(process.env.API_KEY); \
 \
const model = genAI.getGenerativeModel({ model: "gemini-pro" }); \
 \
async function runChat() { \
  // 1. Start a chat session from a model instance. \
  const chat = model.startChat({ \
    history: }, \
      { role: "model", parts: }, \
    ], \
  }); \
 \
  // 2. Send a message using the chat object. \
  const result = await chat.sendMessage("What is a JavaScript closure?"); \
  const response = await result.response; \
  console.log(response.text()); \
} \
 \
runChat(); \


Source: <sup>19</sup>

After (@google/genai)

In the new SDK, chat is a dedicated service, ai.chats. A session is created via ai.chats.create(), which returns a ChatSession object. This object has a sendMessage method, and the response is accessed more directly.


    JavaScript

// New SDK: @google/genai \
 \
const { GoogleGenAI } = require("@google/genai"); \
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY}); \
 \
async function runChat() { \
  // 1. Create a chat session from the dedicated `ai.chats` service. \
  const chatSession = ai.chats.create({ \
    model: "gemini-1.5-flash", \
    history: }, \
      { role: "model", parts: }, \
    ], \
  }); \
 \
  // 2. Send a message using the chatSession object. \
  const result = await chatSession.sendMessage("What is a JavaScript closure?"); \
   \
  // 3. Access the response text directly. \
  console.log(result.text); \
} \
 \
runChat(); \


Source: Pattern from <sup>17</sup>

The elevation of chat to a top-level service (ai.chats) is a deliberate architectural decision that decouples the concept of a "conversation" from the underlying act of "content generation." This decoupling makes the new ChatSession object a more powerful and extensible primitive. It opens the door for future enhancements where a session might handle more complex state management, automatic context window truncation, or session-specific tool configurations, all without altering the core ai.models service. By migrating, developers are adopting a more robust and sophisticated foundation for building conversational AI.


## **Advanced Feature Migration: Streaming and Real-Time Interaction**

One of the most powerful capabilities of modern generative models is their ability to stream responses. However, the term "streaming" can be ambiguous. The user's query about the "Gemini Live API" highlights this common point of confusion. This section provides essential clarification and presents migration paths for both standard HTTP streaming and the true, low-latency WebSocket-based Live API.


### **Demystifying "Streaming": HTTP vs. WebSockets**

Before diving into code, it is crucial to establish a clear understanding of the two distinct streaming paradigms available through the @google/genai SDK. Using the wrong tool for the job can lead to suboptimal performance and architectural dead ends.



* **HTTP Streaming (generateContentStream)**: This is the most common form of streaming. It uses a standard HTTP connection where the server keeps the connection open and sends back the response in chunks as they are generated. This is a **unidirectional** flow of data from the server to the client. Its primary purpose is to improve the perceived performance of an application by reducing the "time to first token." Instead of waiting for the entire response to be generated, the client can begin displaying the text as it arrives, creating a familiar "typewriter" effect. This is the ideal solution for text-heavy applications like chatbots or content generation tools where immediate interactivity is desired but a persistent, two-way connection is unnecessary.
* **WebSocket Live API (ai.live)**: This paradigm uses the WebSocket protocol to establish a persistent, **bidirectional** communication channel between the client and the Gemini server.<sup>23</sup> This open channel allows the client to send continuous streams of data (like audio from a microphone or video from a webcam) \
*to* the server, while *simultaneously* receiving responses from the server. The Live API is specifically designed for ultra-low-latency, interactive use cases that mimic human conversation, such as real-time voice assistants, live translation, or interactive video analysis.<sup>25</sup>

Failing to grasp this distinction is a common pitfall. This guide will use the terms "HTTP Streaming" for the former and "Live API" for the latter to maintain clarity.


### **Migrating Standard HTTP Streaming (generateContentStream)**

This migration path applies to applications that use streaming to display text responses incrementally. The core logic of iterating over the stream remains largely the same, making this a relatively straightforward migration.

Before (@google/generative-ai)

Streaming was initiated by calling generateContentStream on a GenerativeModel instance. The response contained a stream property that could be iterated over.


    JavaScript

// Old SDK: @google/generative-ai \
 \
const { GoogleGenerativeAI } = require("@google/generative-ai"); \
const genAI = new GoogleGenerativeAI(process.env.API_KEY); \
const model = genAI.getGenerativeModel({ model: "gemini-pro" }); \
 \
async function runStreaming() { \
  const prompt = "Write a long, epic poem about the history of computing."; \
   \
  // Call `generateContentStream` on the model instance. \
  const result = await model.generateContentStream(prompt); \
 \
  // Iterate over the `result.stream` property. \
  for await (const chunk of result.stream) { \
    // Access text via the `text()` method. \
    process.stdout.write(chunk.text()); \
  } \
  console.log(); // for a final newline \
} \
 \
runStreaming(); \


*Source: Reconstructed from SDK patterns*

After (@google/genai)

The new SDK follows the same service-oriented pattern. The generateContentStream method is called on the ai.models service, and the response itself is the async iterable stream.


    JavaScript

// New SDK: @google/genai \
 \
const { GoogleGenAI } = require("@google/genai"); \
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY}); \
 \
async function runStreaming() { \
  // Call `generateContentStream` on the `ai.models` service. \
  const responseStream = await ai.models.generateContentStream({ \
    model: 'gemini-1.5-flash', \
    contents: 'Write a long, epic poem about the history of computing.', \
  }); \
 \
  // The response object itself is the async iterable. \
  for await (const chunk of responseStream) { \
    // Access text directly from the `text` property. \
    process.stdout.write(chunk.text); \
  } \
  console.log(); // for a final newline \
} \
 \
runStreaming(); \


Source: <sup>13</sup>

The core for await...of loop structure is preserved, which simplifies the migration for developers. The primary changes are the method's call signature, which is now consistent with the stateless generateContent method, and the more direct access to the response chunk's text content.


### **Unlocking Real-Time with the Gemini Live API (ai.live)**

This capability should be viewed as a **net-new feature**, not a migration. The legacy @google/generative-ai SDK had no equivalent to the WebSocket-based Live API. This is one of the most compelling reasons to upgrade, as it unlocks an entire class of real-time, multimodal applications that were previously not possible with the old library.

The Live API is the correct choice for building voice-first applications, tools that respond to live video feeds, or any scenario requiring natural, human-like conversational latency.<sup>24</sup>

The following is a foundational JavaScript example demonstrating how to establish a Live API session, send a text message, and receive a text response. It showcases how the SDK abstracts the complexity of WebSocket management into a clean, async iterator-based interface.


    JavaScript

// New SDK: @google/genai \
// This is a new feature with no direct equivalent in the old SDK. \
 \
const { GoogleGenAI, Modality } = require("@google/genai"); \
const ai = new GoogleGenAI({apiKey: 'YOUR_API_KEY'}); \
 \
async function runLiveSession() { \
  console.log("Connecting to Live API..."); \
   \
  // 1. Use `ai.live.connect` to establish the WebSocket session. \
  // A Live API compatible model must be used. \
  const session = await ai.live.connect({ \
    model: 'gemini-live-2.5-flash-preview', \
    config: { \
      // Specify the desired response modality: TEXT or AUDIO \
      responseModalities:, \
    }, \
  }); \
 \
  console.log("Live session started successfully."); \
 \
  // 2. Send content to the model using `sendClientContent`. \
  // `turnComplete: true` tells the model to process the prompt and respond. \
  await session.sendClientContent({ \
    turns: [{ role: "user", parts: [{ text: "Hello Gemini! Can you hear me?" }] }], \
    turnComplete: true, \
  }); \
 \
  // 3. Use an async `for...of` loop to listen for responses from the server. \
  // The SDK handles the underlying WebSocket `onmessage` events. \
  for await (const response of session.receive()) { \
    if (response.text) { \
      // Process the text chunk as it arrives. \
      process.stdout.write(response.text); \
    } \
  } \
   \
  console.log("\nSession ended."); \
} \
 \
runLiveSession().catch(console.error); \


Source: Synthesized from <sup>27</sup>

By presenting the Live API as a powerful new capability, the migration is framed not just as a necessary update but as an opportunity to significantly level up an application's feature set. The code example, while basic, demystifies the process of using WebSockets by showing how the SDK provides a familiar async iterator interface, making it accessible even to developers who are not experts in real-time communication protocols. This is the "wow" factor of the new SDK.


## **Migrating Tool Integration: The Evolution of Function Calling**

Connecting large language models to external tools, APIs, and data sources is fundamental to building truly useful applications. The new @google/genai SDK introduces a more structured, reliable, and powerful paradigm for this "tool use," commonly known as function calling. This section details the conceptual shift and the practical code migration required.


### **From Coercion to Contract: A More Structured Approach**

The evolution of function calling represents a shift from an implicit, prompt-based approach to an explicit, schema-based one. In earlier methodologies, developers often had to rely on complex prompt engineering to try and "coerce" the model into generating a response in a specific JSON format that could then be parsed to trigger an external function. This method was often brittle and prone to errors from malformed JSON output.

The new, formalized function calling feature is a first-class citizen of the API. It operates on the principle of a "contract." The developer provides the model with one or more FunctionDeclaration objects. Each declaration is a strict schema, typically based on the OpenAPI 3.0 specification, that defines the function's name, its purpose, and the exact structure of its parameters.<sup>30</sup>

When the model receives a user prompt, it can analyze the user's intent and determine if fulfilling the request would be aided by calling one of the provided functions. If it decides to do so, it doesn't execute the function itself. Instead, it returns a structured FunctionCall object containing the name of the function to call and the arguments, perfectly formatted according to the schema. This creates a reliable contract between the model and the developer's code, dramatically increasing the robustness of tool-using agents and reducing the likelihood of parsing errors.


### **Code-Level Migration for Function Calling**

The following side-by-side examples demonstrate how to define a tool and use it in a request, highlighting the improvements in the new SDK.

Before (@google/generative-ai)

The legacy SDK supported a tools parameter, but the control over the model's behavior was limited, and parsing the response required more steps.


    JavaScript

// Old SDK: @google/generative-ai \
 \
const { GoogleGenerativeAI, FunctionDeclarationSchemaType } = require("@google/generative-ai"); \
const genAI = new GoogleGenerativeAI(process.env.API_KEY); \
const model = genAI.getGenerativeModel({ model: "gemini-pro" }); \
 \
// 1. Define the function declaration. \
const getWeatherTool = { \
  functionDeclarations:, \
    }, \
  }] \
}; \
 \
async function run() { \
  const result = await model.generateContent({ \
    contents: }], \
    // 2. Pass the tool in the request. \
    tools: getWeatherTool, \
  }); \
 \
  const response = await result.response; \
   \
  // 3. Manually navigate the response structure to find the function call. \
  const call = response.candidates.content.parts.functionCall; \
  if (call) { \
    console.log("Function Call:", call.name); \
    console.log("Arguments:", call.args); \
    // Developer would now execute the actual get_current_weather function. \
  } \
} \
 \
run(); \


*Source: Reconstructed based on old API patterns*

After (@google/genai)

The new SDK introduces a more explicit toolConfig parameter for controlling behavior and provides a much cleaner, direct accessor for the resulting function calls.


    JavaScript

// New SDK: @google/genai \
 \
const { GoogleGenAI, FunctionCallingConfigMode, FunctionDeclaration, SchemaType } = require("@google/genai"); \
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY}); \
 \
// 1. Define the function declaration using new enums. \
const getWeatherDeclaration = { \
  name: "get_current_weather", \
  description: "Get the current weather in a given location", \
  parameters: { \
    type: SchemaType.OBJECT, \
    properties: { \
      location: { type: SchemaType.STRING, description: "The city and state, e.g. San Francisco, CA" }, \
    }, \
    required: ["location"], \
  }, \
}; \
 \
async function run() { \
  const response = await ai.models.generateContent({ \
    model: 'gemini-1.5-flash', \
    contents: "What's the weather like in Boston?", \
    // 2. Provide the tool declaration. \
    tools: }], \
    // 3. (Optional but powerful) Explicitly configure tool-calling behavior. \
    config: { \
      toolConfig: { \
        functionCallingConfig: { \
          // 'AUTO' (default): Model decides whether to call a function. \
          // 'ANY': Model is forced to call one of the provided functions. \
          // 'NONE': Model will not call any function. \
          mode: FunctionCallingConfigMode.AUTO, \
        } \
      } \
    }, \
  }); \
 \
  // 4. Access the function calls directly from a clean `functionCalls` property. \
  const functionCalls = response.functionCalls; \
  if (functionCalls && functionCalls.length > 0) { \
    for (const call of functionCalls) { \
      console.log("Function Call:", call.name); \
      console.log("Arguments:", call.args); \
      // Developer would now execute the actual get_current_weather function. \
    } \
  } \
} \
 \
run(); \


Source: <sup>13</sup>

The improvements in the new SDK are significant. The addition of the toolConfig object gives developers fine-grained control over the model's behavior, which is essential for building predictable and reliable agents. The ability to force the model to use a tool (ANY) or to disable tools entirely (NONE) was a capability that previously required cumbersome prompt engineering.<sup>32</sup> Furthermore, the

response.functionCalls property provides a direct, easy-to-parse array of call objects, simplifying the response-handling logic and reducing the potential for errors. This makes the entire process of integrating external tools more robust and developer-friendly.


## **Future-Proofing Your Generative AI Applications**

The migration from @google/generative-ai to the new, unified @google/genai SDK is a critical step for any developer building on Google's generative AI platform. This transition is not merely about staying current; it is a strategic investment in the stability, capability, and future-readiness of your applications. The new SDK offers a superior developer experience through a cleaner, service-oriented architecture, seamless integration between developer and enterprise workflows, and exclusive access to the next generation of features.

By embracing the new SDK, developers gain a more powerful and intuitive toolset. The centralized GoogleGenAI client simplifies authentication and configuration. The stateless, functional nature of the ai.models service enhances flexibility. The dedicated ai.chats service provides a more robust primitive for building conversational experiences. Most importantly, the new SDK is the sole gateway to transformative capabilities like the low-latency, bidirectional Live API, which unlocks entirely new classes of real-time, interactive applications.

To assist in the practical execution of this upgrade, the following checklist summarizes the key steps:


### **Migration Checklist**



1. **Update Dependencies:** In package.json, uninstall @google/generative-ai and install @google/genai. Ensure your Node.js environment is on a supported version (v18+).
2. **Refactor Initialization:** Replace all instantiations of the old SDK with the new central GoogleGenAI client. Configure authentication for either the Gemini Developer API (API key) or Vertex AI (Google Cloud project) within the single client constructor.
3. **Update generateContent Calls:** Modify single-turn generation calls to use the ai.models.generateContent service method, passing the model name and other configurations within the request object.
4. **Migrate Chat Logic:** Refactor chat session management from the old model.startChat() method to the new ai.chats.create() service. Update sendMessage calls to use the new ChatSession object.
5. **Update Streaming Loops:** Adapt HTTP streaming loops to use the ai.models.generateContentStream method. The response object itself is the async iterable, and chunk properties are accessed directly.
6. **Refactor Function Calling:** Update FunctionDeclaration schemas to use the new SDK's enums. Utilize the new tools and toolConfig parameters in your requests for more explicit control. Simplify response parsing by accessing the clean response.functionCalls array.
7. **Explore New Capabilities:** Once migration is complete, investigate the powerful new features available exclusively in @google/genai, starting with the ai.live API for real-time applications.

By completing this migration, developers are not just resolving a dependency issue; they are aligning their projects with the strategic direction of Google's AI ecosystem. The unified @google/genai SDK is the foundation upon which future innovations—new models, new modalities, and new capabilities—will be built. The effort invested in this migration today ensures that your applications are positioned to seamlessly adopt the next wave of generative AI technology as it becomes available.


#### Works cited



1. @google/generative-ai - npm, accessed August 11, 2025, [https://www.npmjs.com/package/@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai)
2. google-gemini/deprecated-generative-ai-js: This SDK is ... - GitHub, accessed August 11, 2025, [https://github.com/google-gemini/deprecated-generative-ai-js](https://github.com/google-gemini/deprecated-generative-ai-js)
3. Google Gen AI SDK | Generative AI on Vertex AI - Google Cloud, accessed August 11, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview](https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview)
4. Gemini API libraries | Google AI for Developers, accessed August 11, 2025, [https://ai.google.dev/gemini-api/docs/libraries](https://ai.google.dev/gemini-api/docs/libraries)
5. @google/genai - npm, accessed August 11, 2025, [https://www.npmjs.com/package/@google/genai](https://www.npmjs.com/package/@google/genai)
6. Gemini API quickstart | Google AI for Developers, accessed August 11, 2025, [https://ai.google.dev/gemini-api/docs/quickstart](https://ai.google.dev/gemini-api/docs/quickstart)
7. [Deprecated] Google AI JavaScript SDK for the Gemini API - GitHub, accessed August 11, 2025, [https://github.com/google-gemini/deprecated-generative-ai-js/blob/main/README.md](https://github.com/google-gemini/deprecated-generative-ai-js/blob/main/README.md)
8. Migrating to the new Google Gen AI SDK (Python) - Medium, accessed August 11, 2025, [https://medium.com/google-cloud/migrating-to-the-new-google-gen-ai-sdk-python-074d583c2350](https://medium.com/google-cloud/migrating-to-the-new-google-gen-ai-sdk-python-074d583c2350)
9. @langchain/google-genai - npm, accessed August 11, 2025, [https://www.npmjs.com/package/@langchain/google-genai](https://www.npmjs.com/package/@langchain/google-genai)
10. Google | 🦜️ Langchain, accessed August 11, 2025, [https://js.langchain.com/docs/integrations/platforms/google/](https://js.langchain.com/docs/integrations/platforms/google/)
11. ai-sdk/google - NPM, accessed August 11, 2025, [https://www.npmjs.com/package/@ai-sdk/google](https://www.npmjs.com/package/@ai-sdk/google)
12. AI SDK by Vercel, accessed August 11, 2025, [https://ai-sdk.dev/docs/introduction](https://ai-sdk.dev/docs/introduction)
13. googleapis/js-genai: TypeScript/JavaScript SDK for Gemini and Vertex AI. - GitHub, accessed August 11, 2025, [https://github.com/googleapis/js-genai](https://github.com/googleapis/js-genai)
14. raw.githubusercontent.com, accessed August 11, 2025, [https://raw.githubusercontent.com/google/generative-ai-js/cec7440c0d34d29298333d920d4f44f8478d27d5/CHANGELOG.md](https://raw.githubusercontent.com/google/generative-ai-js/cec7440c0d34d29298333d920d4f44f8478d27d5/CHANGELOG.md)
15. Migrate to the Google GenAI SDK | Gemini API | Google AI for ..., accessed August 11, 2025, [https://ai.google.dev/gemini-api/docs/migrate](https://ai.google.dev/gemini-api/docs/migrate)
16. @google/genai - The GitHub pages site for the googleapis organization., accessed August 11, 2025, [https://googleapis.github.io/js-genai/](https://googleapis.github.io/js-genai/)
17. How to Use the Google Gen AI TypeScript/JavaScript SDK to Build Powerful Generative AI Applications - Apidog, accessed August 11, 2025, [https://apidog.com/blog/how-to-use-the-google-gen-ai/](https://apidog.com/blog/how-to-use-the-google-gen-ai/)
18. Google Gemini Generative AI Integration in Node JS - Rishav's Blog, accessed August 11, 2025, [https://rishavd3v.hashnode.dev/google-gemini-with-nodejs](https://rishavd3v.hashnode.dev/google-gemini-with-nodejs)
19. Building a Chat Integration with Google Gemini - Raymond Camden, accessed August 11, 2025, [https://www.raymondcamden.com/2024/04/30/building-a-chat-integration-with-google-gemini](https://www.raymondcamden.com/2024/04/30/building-a-chat-integration-with-google-gemini)
20. Text generation | Gemini API | Google AI for Developers, accessed August 11, 2025, [https://ai.google.dev/gemini-api/docs/text-generation](https://ai.google.dev/gemini-api/docs/text-generation)
21. README.md - gemini-api-php/client - GitHub, accessed August 11, 2025, [https://github.com/gemini-api-php/client/blob/main/README.md](https://github.com/gemini-api-php/client/blob/main/README.md)
22. Text generation | Generative AI on Vertex AI - Google Cloud, accessed August 11, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/send-chat-prompts-gemini](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/send-chat-prompts-gemini)
23. Live API reference | Generative AI on Vertex AI - Google Cloud, accessed August 11, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live)
24. Live API | Generative AI on Vertex AI - Google Cloud, accessed August 11, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/live-api](https://cloud.google.com/vertex-ai/generative-ai/docs/live-api)
25. Get started with Live API | Gemini API | Google AI for Developers, accessed August 11, 2025, [https://ai.google.dev/gemini-api/docs/live](https://ai.google.dev/gemini-api/docs/live)
26. Bidirectional streaming using the Gemini Live API | Firebase AI Logic - Google, accessed August 11, 2025, [https://firebase.google.com/docs/ai-logic/live-api](https://firebase.google.com/docs/ai-logic/live-api)
27. Live API capabilities guide | Gemini API | Google AI for Developers, accessed August 11, 2025, [https://ai.google.dev/gemini-api/docs/live-guide](https://ai.google.dev/gemini-api/docs/live-guide)
28. Stream AI Text in Real-Time with Google's Gemini API (@google/genai) using Angular | by Shaikh Niamatullah | Medium, accessed August 11, 2025, [https://medium.com/@shaikhniamatullah/stream-ai-text-in-real-time-with-googles-gemini-api-using-angular-google-genai-56dc384f7836](https://medium.com/@shaikhniamatullah/stream-ai-text-in-real-time-with-googles-gemini-api-using-angular-google-genai-56dc384f7836)
29. google-gemini/live-api-web-console: A react-based starter ... - GitHub, accessed August 11, 2025, [https://github.com/google-gemini/live-api-web-console](https://github.com/google-gemini/live-api-web-console)
30. Function calling with the Gemini API | Google AI for Developers, accessed August 11, 2025, [https://ai.google.dev/gemini-api/docs/function-calling](https://ai.google.dev/gemini-api/docs/function-calling)
31. How to Interact with APIs Using Function Calling in Gemini | Google Codelabs, accessed August 11, 2025, [https://codelabs.developers.google.com/codelabs/gemini-function-calling](https://codelabs.developers.google.com/codelabs/gemini-function-calling)
32. Function calling reference | Generative AI on Vertex AI - Google Cloud, accessed August 11, 2025, [https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling)