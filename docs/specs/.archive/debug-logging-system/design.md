# Design Document

## Overview

The debug logging system provides a configurable, production-safe logging solution that allows developers to enable detailed debugging information during development while ensuring clean production builds. The system supports per-component logging control and multiple configuration methods.

## Architecture

### Core Components

1. **DebugLogger Class** - Central logging utility with component-specific controls
2. **Configuration Manager** - Handles debug settings from multiple sources
3. **Component Integration** - Seamless integration with existing Lit components
4. **Build-time Optimization** - Automatic removal of debug code in production builds

### Configuration Hierarchy

The system supports multiple configuration sources with the following priority order:
1. URL parameters (highest priority)
2. localStorage settings
3. Environment variables
4. Default settings (lowest priority)

## Components and Interfaces

### DebugLogger Interface

```typescript
interface DebugLoggerConfig {
  enabled: boolean;
  components: Record<string, boolean>;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  timestamp: boolean;
  prefix: boolean;
}

interface LogEntry {
  component: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: Date;
}

class DebugLogger {
  private config: DebugLoggerConfig;
  
  constructor(config?: Partial<DebugLoggerConfig>);
  
  // Component-specific logging methods
  debug(component: string, message: string, data?: any): void;
  info(component: string, message: string, data?: any): void;
  warn(component: string, message: string, data?: any): void;
  error(component: string, message: string, data?: any): void;
  
  // Configuration methods
  enableComponent(component: string): void;
  disableComponent(component: string): void;
  isComponentEnabled(component: string): boolean;
  updateConfig(config: Partial<DebugLoggerConfig>): void;
  
  // Utility methods
  createComponentLogger(component: string): ComponentLogger;
}

interface ComponentLogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}
```

### Configuration Manager

```typescript
interface ConfigSource {
  name: string;
  priority: number;
  load(): Partial<DebugLoggerConfig>;
  save?(config: Partial<DebugLoggerConfig>): void;
}

class ConfigurationManager {
  private sources: ConfigSource[];
  
  constructor();
  addSource(source: ConfigSource): void;
  loadConfig(): DebugLoggerConfig;
  saveConfig(config: Partial<DebugLoggerConfig>): void;
}
```

## Data Models

### Configuration Storage

**Environment Variables:**
- `DEBUG` - Global debug enable/disable
- `DEBUG_COMPONENTS` - Comma-separated list of enabled components
- `DEBUG_LEVEL` - Default log level

**localStorage Keys:**
- `debug-logger-config` - JSON object with full configuration
- `debug-components` - Component-specific settings

**URL Parameters:**
- `debug` - Global enable (true/false)
- `debug-components` - Comma-separated component list
- `debug-level` - Log level setting

### Component Registration

Components will be automatically registered when they create their first logger instance. Known components include:
- `transcript-auto-scroll`
- `call-transcript`
- `chat-view`
- `live2d-visual`
- `live2d-model`
- `live2d-canvas`

## Error Handling

### Graceful Degradation
- If configuration loading fails, fall back to safe defaults
- If localStorage is unavailable, use memory-only configuration
- If URL parameters are malformed, ignore and continue with other sources

### Error Logging
- Configuration errors are logged to console.error (always enabled)
- Invalid component names are silently ignored
- Malformed log data is sanitized before output

### Production Safety
- All debug logging is wrapped in development-only checks
- Production builds automatically strip debug code via build-time optimization
- No performance impact in production environments

## Testing Strategy

### Unit Tests
1. **DebugLogger Class Tests**
   - Configuration loading and merging
   - Component enable/disable functionality
   - Log level filtering
   - Message formatting

2. **Configuration Manager Tests**
   - Multiple source priority handling
   - Persistence and loading
   - Error handling for invalid configurations

3. **Component Integration Tests**
   - Logger creation and usage
   - Component-specific filtering
   - Performance impact measurement

### Integration Tests
1. **End-to-End Configuration Tests**
   - URL parameter parsing
   - localStorage persistence
   - Environment variable loading

2. **Component Usage Tests**
   - Real component integration
   - Log output verification
   - Performance benchmarking

### Build Tests
1. **Production Build Verification**
   - Debug code removal confirmation
   - Bundle size impact measurement
   - Runtime performance validation

## Implementation Details

### Build-time Optimization

The system will use Vite's define feature to replace debug calls with no-ops in production:

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  return {
    define: {
      '__DEBUG__': mode === 'development',
      '__DEBUG_COMPONENTS__': JSON.stringify(
        mode === 'development' ? process.env.DEBUG_COMPONENTS?.split(',') || [] : []
      )
    }
  };
});
```

### Component Integration Pattern

```typescript
// Example usage in transcript-auto-scroll.ts
import { createComponentLogger } from './debug-logger';

const logger = createComponentLogger('transcript-auto-scroll');

export class TranscriptAutoScroll {
  shouldAutoScroll(element: Element): boolean {
    const scrollTop = element.scrollTop;
    const clientHeight = element.clientHeight;
    const scrollHeight = element.scrollHeight;
    const threshold = this.options.threshold;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - threshold;

    logger.debug('Scroll check', {
      scrollTop,
      clientHeight,
      scrollHeight,
      threshold,
      isNearBottom
    });

    return isNearBottom;
  }
}
```

### Configuration UI (Optional Enhancement)

A simple debug panel can be added for runtime configuration:

```typescript
@customElement('debug-panel')
export class DebugPanel extends LitElement {
  // Simple UI for toggling component debug settings
  // Accessible via URL parameter ?debug-panel=true
}
```

This design provides a robust, flexible debugging system that maintains production performance while offering powerful development-time debugging capabilities.