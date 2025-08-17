# Migration Guide: @google/generative-ai to @google/genai

This guide provides a practical path for migrating from the legacy `@google/generative-ai` package to the new, unified Google Gen AI SDK, `@google/genai`.

The `@google/generative-ai` package is deprecated and will be unsupported after **August 31, 2025**. All new projects should use `@google/genai`.

## Quick Reference

| Package Name             | NPM Link                                                              | GitHub Repository                                                              | Status                   | Support Ends      |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------ | ----------------- |
| `@google/genai`          | [npmjs.com/package/@google/genai](https://www.npmjs.com/package/@google/genai) | [googleapis/js-genai](https://github.com/googleapis/js-genai)                  | **Active & Recommended** | N/A               |
| `@google/generative-ai`  | [npmjs.com/package/@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) | [google-gemini/deprecated-generative-ai-js](https://github.com/google-gemini/deprecated-generative-ai-js) | **Deprecated**           | August 31, 2025   |

## Key Architectural Change

The most significant change is the shift from a model-centric to a service-oriented architecture.

-   **Legacy SDK:** You would instantiate a `GoogleGenerativeAI` client to get a `GenerativeModel` instance, and then call methods on that model object.
-   **New SDK:** You instantiate a single, central `GoogleGenAI` client. All functionality (content generation, chat, file management, etc.) is accessed through services on this client instance (e.g., `ai.models`, `ai.chats`).

## Migration Steps

### 1. Update Dependencies

Uninstall the old package and install the new one.

```bash
npm uninstall @google/generative-ai
npm install @google/genai
```

The new SDK requires Node.js v18+.

### 2. Update Initialization and Authentication

The new `GoogleGenAI` client centralizes configuration.

#### Using an API Key

**Before (`@google/generative-ai`)**
```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");

// API key passed directly to the constructor
const genAI = new GoogleGenerativeAI("YOUR_API_KEY");
```

**After (`@google/genai`)**
```javascript
const { GoogleGenAI } = require("@google/genai");

// Option 1: Pass key in a config object
const ai = new GoogleGenAI({apiKey: "YOUR_API_KEY"});

// Option 2 (Recommended): Use environment variables
// The SDK automatically finds GOOGLE_API_KEY or GEMINI_API_KEY
// In your shell: export GOOGLE_API_KEY="YOUR_API_KEY"
const ai_env = new GoogleGenAI({});
```

#### Using Vertex AI

The new SDK has first-class support for Vertex AI.

**After (`@google/genai`)**
```javascript
const { GoogleGenAI } = require("@google/genai");

// Set environment variables and initialize
// In your shell:
// export GOOGLE_GENAI_USE_VERTEXAI=true
// export GOOGLE_CLOUD_PROJECT='your-gcp-project-id'
// export GOOGLE_CLOUD_LOCATION='us-central1'
const ai_vertex_env = new GoogleGenAI({});
```

### 3. Migrate Core Functionality

#### Single-Turn Generation (`generateContent`)

**Before (`@google/generative-ai`)**
```javascript
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const result = await model.generateContent(prompt);
const response = await result.response;
console.log(response.text());
```

**After (`@google/genai`)**
```javascript
const response = await ai.models.generateContent({
  model: "gemini-1.5-flash",
  contents: "Your prompt here",
});
console.log(response.text);
```

#### Stateful Chat

**Before (`@google/generative-ai`)**
```javascript
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const chat = model.startChat({ history: [] });
const result = await chat.sendMessage("What is a JavaScript closure?");
const response = await result.response;
console.log(response.text());
```

**After (`@google/genai`)**
```javascript
const chatSession = ai.chats.create({
  model: "gemini-1.5-flash",
  history: [],
});
const result = await chatSession.sendMessage("What is a JavaScript closure?");
console.log(result.text);
```

#### HTTP Streaming (`generateContentStream`)

**Before (`@google/generative-ai`)**
```javascript
const result = await model.generateContentStream(prompt);
for await (const chunk of result.stream) {
  process.stdout.write(chunk.text());
}
```

**After (`@google/genai`)**
```javascript
const responseStream = await ai.models.generateContentStream({
  model: 'gemini-1.5-flash',
  contents: 'Your prompt here',
});
for await (const chunk of responseStream) {
  process.stdout.write(chunk.text);
}
```

### 4. Migrate Function Calling

The new SDK provides a more structured and reliable approach for tool use.

**Before (`@google/generative-ai`)**
```javascript
// Response parsing was nested
const call = response.candidates.content.parts.functionCall;
```

**After (`@google/genai`)**
```javascript
// Cleaner access to function calls
const functionCalls = response.functionCalls;
if (functionCalls) {
  for (const call of functionCalls) {
    // ...
  }
}

// More control via toolConfig
const response = await ai.models.generateContent({
  // ...
  tools: [getWeatherDeclaration],
  config: {
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.AUTO, // AUTO, ANY, or NONE
      }
    }
  },
});
```

### 5. New Capability: The Live API

The `@google/genai` SDK introduces the `ai.live` service, a WebSocket-based API for ultra-low-latency, bidirectional communication. This is a new feature and has no equivalent in the legacy SDK. It's ideal for real-time voice and video applications.

```javascript
// Example: Establish a Live API session
const session = await ai.live.connect({
  model: 'gemini-live-2.5-flash-preview',
  config: {
    responseModalities: [Modality.TEXT],
  },
});

await session.sendClientContent({
  turns: [{ role: "user", parts: [{ text: "Hello Gemini!" }] }],
  turnComplete: true,
});

for await (const response of session.receive()) {
  if (response.text) {
    process.stdout.write(response.text);
  }
}
```

## Migration Checklist

1.  **Update Dependencies:** Uninstall `@google/generative-ai` and install `@google/genai`.
2.  **Refactor Initialization:** Switch to the central `GoogleGenAI` client.
3.  **Update `generateContent` Calls:** Use the `ai.models.generateContent` service method.
4.  **Migrate Chat Logic:** Use the `ai.chats.create()` service.
5.  **Update Streaming Loops:** Use the `ai.models.generateContentStream` method.
6.  **Refactor Function Calling:** Use the new `tools` and `toolConfig` parameters.
7.  **Explore New Capabilities:** Investigate the `ai.live` API for real-time applications.