// src/debug-logger.ts

/**
 * Configuration for the DebugLogger.
 */
export interface DebugLoggerConfig {
  enabled: boolean;
  components: Record<string, boolean>;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  timestamp: boolean;
  prefix: boolean;
}

/**
 * Represents a single log entry.
 */
export interface LogEntry {
  component: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: Date;
}

/**
 * Interface for a simplified, component-specific logger.
 */
export interface ComponentLogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

const LOG_LEVELS: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * A comprehensive logger for debugging with component-specific controls.
 */
export class DebugLogger {
  private config: DebugLoggerConfig;

  private static readonly defaultConfig: DebugLoggerConfig = {
    enabled: process.env.NODE_ENV !== 'production',
    components: {},
    logLevel: 'info',
    timestamp: true,
    prefix: true,
  };

  /**
   * Initializes a new instance of the DebugLogger.
   * @param config - Partial configuration to override defaults.
   */
  constructor(config: Partial<DebugLoggerConfig> = {}) {
    this.config = { ...DebugLogger.defaultConfig };
    this.loadConfigFromEnv();
    this.loadConfigFromLocalStorage();
    this.loadConfigFromUrl();
    this.updateConfig(config);
  }

  private loadConfigFromEnv(): void {
    // In a real browser environment, you might use import.meta.env
    // For this example, we'll simulate it.
    const debugEnabled = process.env.DEBUG_ENABLED;
    if (debugEnabled) {
      this.config.enabled = debugEnabled === 'true';
    }
  }

  private loadConfigFromLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;

    const storedConfig = localStorage.getItem('debugLoggerConfig');
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig);
        this.updateConfig(parsedConfig);
      } catch (e) {
        console.error('Failed to parse debug logger config from localStorage', e);
      }
    }
  }

  private loadConfigFromUrl(): void {
    if (typeof URLSearchParams === 'undefined' || typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const debugParam = params.get('debug');

    if (debugParam !== null) {
      this.config.enabled = true;
      if (debugParam === '*') {
        this.config.components['*'] = true;
      } else if (debugParam) {
        debugParam.split(',').forEach(comp => this.enableComponent(comp));
      }
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', component: string, message: string, data?: any): void {
    if (!this.config.enabled || !this.isComponentEnabled(component)) {
      return;
    }

    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.logLevel]) {
      return;
    }

    const entry: LogEntry = {
      component,
      level,
      message,
      data,
      timestamp: new Date(),
    };

    this.formatAndOutput(entry);
  }

  private formatAndOutput(entry: LogEntry): void {
    const { component, level, message, data, timestamp } = entry;
    const parts = [];

    if (this.config.timestamp) {
      parts.push(`[${timestamp.toISOString()}]`);
    }
    if (this.config.prefix) {
      parts.push(`[${component}]`);
    }
    parts.push(level.toUpperCase() + ':', message);

    const logMethod = console[level] || console.log;
    
    if (data !== undefined) {
      logMethod(parts.join(' '), data);
    } else {
      logMethod(parts.join(' '));
    }
  }

  /**
   * Logs a debug message for a specific component.
   */
  debug(component: string, message: string, data?: any): void {
    this.log('debug', component, message, data);
  }

  /**
   * Logs an info message for a specific component.
   */
  info(component: string, message: string, data?: any): void {
    this.log('info', component, message, data);
  }

  /**
   * Logs a warning message for a specific component.
   */
  warn(component: string, message: string, data?: any): void {
    this.log('warn', component, message, data);
  }

  /**
   * Logs an error message for a specific component.
   */
  error(component: string, message: string, data?: any): void {
    this.log('error', component, message, data);
  }

  /**
   * Enables logging for a specific component.
   */
  enableComponent(component: string): void {
    this.config.components[component] = true;
  }

  /**
   * Disables logging for a specific component.
   */
  disableComponent(component: string): void {
    this.config.components[component] = false;
  }

  /**
   * Checks if logging is enabled for a specific component.
   */
  isComponentEnabled(component: string): boolean {
    if (this.config.components['*']) return true;
    
    const specificComponents = Object.keys(this.config.components).filter(c => c !== '*' && this.config.components[c]);
    if (specificComponents.length > 0) {
        return !!this.config.components[component];
    }
    
    return true; 
  }

  /**
   * Updates the logger's configuration.
   */
  updateConfig(config: Partial<DebugLoggerConfig>): void {
    this.config = { ...this.config, ...config, components: {...this.config.components, ...config.components} };
  }

  /**
   * Creates a simplified logger instance for a specific component.
   */
  createComponentLogger(component: string): ComponentLogger {
    return {
      debug: (message: string, data?: any) => this.debug(component, message, data),
      info: (message: string, data?: any) => this.info(component, message, data),
      warn: (message: string, data?: any) => this.warn(component, message, data),
      error: (message: string, data?: any) => this.error(component, message, data),
    };
  }
}

// Global instance
export const debugLogger = new DebugLogger();