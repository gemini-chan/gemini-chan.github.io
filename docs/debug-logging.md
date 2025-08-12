# Debug Logging System

The debug logging system provides a flexible and powerful way to manage logging in the application. It allows for component-specific logging, dynamic configuration from multiple sources, and build-time optimization to remove logging code from production builds.

## Features

- **Component-Specific Logging:** Enable or disable logging for individual components.
- **Multiple Configuration Sources:** Configure the logger via URL parameters, `localStorage`, or environment variables.
- **Log Levels:** Control the verbosity of the output with different log levels (`debug`, `info`, `warn`, `error`).
- **Build-Time Optimization:** Unused logger calls can be completely removed from the production bundle, resulting in a smaller file size and better performance.
- **Rich Logging Methods:** Includes methods for tracing function calls (`trace`) and measuring execution time (`time`).

## Configuration

The logger can be configured in several ways, with the following priority order:

1.  **URL Parameters:** Highest priority. Useful for temporary debugging sessions.
2.  **`localStorage`:** Medium priority. Persists configuration across sessions.
3.  **Environment Variables:** Low priority. Good for setting default behavior in different environments.

### URL Parameters

You can enable debugging for specific components by adding a `debug` query parameter to the URL.

- **Enable all components:**
  ```
  https://your-app.com?debug=*
  ```

- **Enable specific components:**
  ```
  https://your-app.com?debug=ChatView,Live2DModel
  ```

### `localStorage`

You can set a persistent configuration by using the browser's developer console.

```javascript
localStorage.setItem('debugLoggerConfig', JSON.stringify({
  enabled: true,
  components: {
    'ChatView': true,
    'Live2DModel': false
  },
  logLevel: 'debug'
}));
```

### Environment Variables

The logger can be enabled or disabled at build time using the `DEBUG_ENABLED` environment variable.

```bash
DEBUG_ENABLED=true npm run dev
```

## Usage

To use the logger, import the `createComponentLogger` function and create a logger instance for your component.

### Creating a Logger

```typescript
// src/components/my-component.ts
import { createComponentLogger } from '../debug-logger';

const logger = createComponentLogger('MyComponent');

logger.info('Component initialized');
```

### Logger Methods

#### `debug(message, data?)`

Logs a debug message. These are the most verbose messages and are typically disabled in production.

```typescript
logger.debug('User clicked a button', { userId: 123 });
```

#### `info(message, data?)`

Logs an informational message.

```typescript
logger.info('Data loaded successfully');
```

#### `warn(message, data?)`

Logs a warning message.

```typescript
logger.warn('API response is slow', { latency: 2000 });
```

#### `error(message, data?)`

Logs an error message.

```typescript
logger.error('Failed to fetch data', { error: new Error('Network error') });
```

#### `trace(methodName, ...args)`

Traces the entry into a method, logging its name and arguments.

```typescript
function processData(data) {
  logger.trace('processData', data);
  // ...
}
```

#### `time(label)`

Measures the execution time of a block of code. It returns a function that, when called, logs the elapsed time.

```typescript
const done = logger.time('dataProcessing');
// Perform a long-running task
// ...
done(); // Logs "dataProcessing took 123.45ms"
```

## Build-Time Optimization

The logging system is designed to have minimal impact on production builds. This is achieved through build-time variables that can be set by a bundler like Vite or Webpack.

- `__DEBUG__`: A global boolean that, if `false`, will cause all logging code to be removed from the bundle.
- `__DEBUG_COMPONENTS__`: An array of strings with component names that are enabled by default.

By configuring your build process to set `__DEBUG__` to `false` in production, you can ensure that no debugging code is included in the final output, which improves performance and reduces the bundle size.