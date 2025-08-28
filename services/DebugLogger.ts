// src/debug-logger.ts

declare const __DEBUG__: boolean;
declare const __DEBUG_COMPONENTS__: string[];

/**
 * Configuration for the DebugLogger.
 */
export interface DebugLoggerConfig {
  enabled: boolean;
  components: Record<string, boolean>;
  logLevel: "trace" | "debug" | "info" | "warn" | "error";
  timestamp: boolean;
  prefix: boolean;
}

/**
 * Represents a single log entry.
 */
export interface LogEntry {
  component: string;
  level: "trace" | "debug" | "info" | "warn" | "error";
  message: string;
  data?: unknown;
  timestamp: Date;
}

/**
 * Interface for a simplified, component-specific logger.
 */
export interface ComponentLogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  trace(message: string, data?: unknown): void;
  time(label: string): () => void;
}

const LOG_LEVELS: Record<string, number> = {
  trace: -1,
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Defines the contract for a configuration source.
 */
interface ConfigSource {
  name: string;
  priority: number;
  load(): Partial<DebugLoggerConfig>;
  save?(config: Partial<DebugLoggerConfig>): void;
}

/**
 * Manages configuration from multiple sources, merging them based on priority.
 */
class ConfigurationManager {
  private sources: ConfigSource[] = [];

  /**
   * Adds a new configuration source.
   * @param source - The configuration source to add.
   */
  addSource(source: ConfigSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Loads the final, merged configuration from all sources.
   * @returns The merged configuration.
   */
  loadConfig(): DebugLoggerConfig {
    const components: Record<string, boolean> = {};
    if (typeof __DEBUG_COMPONENTS__ !== "undefined") {
      for (const comp of __DEBUG_COMPONENTS__) {
        components[comp] = true;
      }
    }

    const defaultConfig: DebugLoggerConfig = {
      enabled:
        typeof __DEBUG__ !== "undefined"
          ? __DEBUG__
          : process.env.NODE_ENV !== "production",
      components,
      // Simple flow: dev = full debug; prod = off
      logLevel:
        typeof __DEBUG__ !== "undefined" && __DEBUG__ ? "debug" : "error",
      timestamp: true,
      prefix: true,
    };

    // Simple mode: dev server = all debug on; prod = all debug off
    if (defaultConfig.enabled) {
      defaultConfig.components = { "*": true };
      defaultConfig.logLevel = "debug";
      return defaultConfig;
    } else {
      defaultConfig.components = {};
      defaultConfig.logLevel = "error";
      return defaultConfig;
    }
  }

  /**
   * Saves a partial configuration to all saveable sources.
   * @param config - The partial configuration to save.
   */
  saveConfig(config: Partial<DebugLoggerConfig>): void {
    for (const source of this.sources) {
      if (source.save) {
        source.save(config);
      }
    }
  }
}
/**
 * A comprehensive logger for debugging with component-specific controls.
 */
export class DebugLogger {
  private config: DebugLoggerConfig;
  private configManager: ConfigurationManager;
  private throttles = new Map<string, { wait: number; leading: boolean; trailing: boolean; last: number; timeoutId?: number | null; pending?: LogEntry | null }>();

  /**
   * Initializes a new instance of the DebugLogger.
   * @param config - Partial configuration to override defaults.
   */
  constructor(config: Partial<DebugLoggerConfig> = {}) {
    this.configManager = new ConfigurationManager();
    this.initializeSources();
    this.config = this.configManager.loadConfig();
    this.updateConfig(config);

    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        if (event.key === "debugLoggerConfig") {
          this.config = this.configManager.loadConfig();
        }
      });
    }
  }

  private initializeSources(): void {
    // URL Source (Priority 3)
    this.configManager.addSource({
      name: "URL",
      priority: 3,
      load: () => {
        const config: Partial<DebugLoggerConfig> = {};
        if (
          typeof URLSearchParams === "undefined" ||
          typeof window === "undefined"
        )
          return config;

        const params = new URLSearchParams(window.location.search);
        const debugParam = params.get("debug");

        // In development builds, ignore URL narrowing (production-only narrowing)
        if (debugParam !== null && process.env.NODE_ENV === 'production') {
          config.enabled = true;
          config.components = {};
          if (debugParam === "*") {
            config.components["*"] = true;
          } else if (debugParam) {
            for (const comp of debugParam.split(",")) {
              if (config.components) config.components[comp] = true;
            }
          }
        }
        return config;
      },
    });

    // LocalStorage Source (Priority 2)
    this.configManager.addSource({
      name: "localStorage",
      priority: 2,
      load: () => {
        if (typeof localStorage === "undefined") return {};
        const storedConfig = localStorage.getItem("debugLoggerConfig");
        if (storedConfig) {
          try {
            return JSON.parse(storedConfig);
          } catch (e) {
            console.error(
              "Failed to parse debug logger config from localStorage",
              e,
            );
          }
        }
        return {};
      },
      save: (config) => {
        if (typeof localStorage === "undefined") return;
        const currentConfig = this.configManager.loadConfig();
        const newConfig = {
          ...currentConfig,
          ...config,
          components: { ...currentConfig.components, ...config.components },
        };
        localStorage.setItem("debugLoggerConfig", JSON.stringify(newConfig));
      },
    });

    // Environment Source (Priority 1)
    this.configManager.addSource({
      name: "Environment",
      priority: 1,
      load: () => {
        const config: Partial<DebugLoggerConfig> = {};
        const debug = process.env.DEBUG;
        const debugComponents = process.env.DEBUG_COMPONENTS;
        const debugLevel = process.env.DEBUG_LEVEL;

        if (debug) {
          config.enabled = ["true", "1", "on", "yes"].includes(
            debug.toLowerCase(),
          );
        }

        if (debugComponents) {
          config.components = {};
          if (debugComponents === "*") {
            config.components["*"] = true;
          } else {
            for (const comp of debugComponents.split(",")) {
              if (config.components) config.components[comp.trim()] = true;
            }
          }
        }

        if (
          debugLevel &&
          ["debug", "info", "warn", "error"].includes(debugLevel)
        ) {
          config.logLevel = debugLevel as "debug" | "info" | "warn" | "error";
        }

        return config;
      },
    });
  }

  private log(
    level: "trace" | "debug" | "info" | "warn" | "error",
    component: string,
    message: string,
    data?: unknown,
  ): void {
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
    const throttle = this.throttles.get(component);
    
    // If no throttling is configured, output immediately
    if (!throttle) {
      this.outputLog(entry);
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - throttle.last;
    
    // Handle leading edge
    if (throttle.leading && timeSinceLast >= throttle.wait) {
      throttle.last = now;
      this.outputLog(entry);
      return;
    }
    
    // Handle trailing edge
    if (throttle.trailing) {
      // Clear any existing timeout
      if (throttle.timeoutId) {
        clearTimeout(throttle.timeoutId);
      }
      
      // Store the pending entry
      throttle.pending = entry;
      
      // Calculate remaining time
      const remainingTime = throttle.wait - timeSinceLast;
      
      // Set timeout to emit the pending entry
      throttle.timeoutId = window.setTimeout(() => {
        if (throttle.pending) {
          this.outputLog(throttle.pending);
          throttle.last = Date.now();
          throttle.pending = null;
        }
        throttle.timeoutId = null;
      }, Math.max(0, remainingTime));
    }
  }

  private outputLog(entry: LogEntry): void {
    const { component, level, message, data, timestamp } = entry;
    const parts = [];

    if (this.config.timestamp) {
      parts.push(`[${timestamp.toISOString()}]`);
    }
    if (this.config.prefix) {
      parts.push(`[${component}]`);
    }
    parts.push(`${level.toUpperCase()}:`, message);

    const logMethod = console[level] || console.log;

    if (data !== undefined) {
      logMethod(parts.join(" "), data);
    } else {
      logMethod(parts.join(" "));
    }
  }

  /**
   * Logs a debug message for a specific component.
   */
  debug(component: string, message: string, data?: unknown): void {
    this.log("debug", component, message, data);
  }

  /**
   * Logs an info message for a specific component.
   */
  info(component: string, message: string, data?: unknown): void {
    this.log("info", component, message, data);
  }

  /**
   * Logs a warning message for a specific component.
   */
  warn(component: string, message: string, data?: unknown): void {
    this.log("warn", component, message, data);
  }

  /**
   * Logs an error message for a specific component.
   */
  error(component: string, message: string, data?: unknown): void {
    this.log("error", component, message, data);
  }

  /**
   * Set throttling configuration for a component
   */
  public setThrottle(component: string, wait: number, opts?: { leading?: boolean; trailing?: boolean }): void {
    const leading = opts?.leading !== false; // default true
    const trailing = opts?.trailing !== false; // default true
    
    this.throttles.set(component, {
      wait,
      leading,
      trailing,
      last: 0
    });
  }

  /**
   * Clear throttling configuration for a component
   */
  public clearThrottle(component: string): void {
    const throttle = this.throttles.get(component);
    if (throttle) {
      if (throttle.timeoutId) {
        clearTimeout(throttle.timeoutId);
      }
      this.throttles.delete(component);
    }
  }

  /**
   * Clear all throttling configurations
   */
  public clearAllThrottles(): void {
    for (const [component, throttle] of this.throttles.entries()) {
      if (throttle.timeoutId) {
        clearTimeout(throttle.timeoutId);
      }
    }
    this.throttles.clear();
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
    if (this.config.components["*"]) return true;

    const specificComponentKeys = Object.keys(this.config.components).filter(
      (c) => c !== "*",
    );

    if (specificComponentKeys.length > 0) {
      return !!this.config.components[component];
    }

    return true;
  }

  /**
   * Updates the logger's configuration.
   */
  updateConfig(config: Partial<DebugLoggerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      components: { ...this.config.components, ...config.components },
    };
    this.configManager.saveConfig(this.config);
  }

  /**
   * Creates a simplified logger instance for a specific component.
   */
  createComponentLogger(component: string): ComponentLogger {
    return {
      debug: (message: string, data?: unknown) =>
        this.debug(component, message, data),
      info: (message: string, data?: unknown) =>
        this.info(component, message, data),
      warn: (message: string, data?: unknown) =>
        this.warn(component, message, data),
      error: (message: string, data?: unknown) =>
        this.error(component, message, data),
      trace: (message: string, data?: unknown) =>
        this.log("trace", component, message, data),
      time: (label: string) => {
        const startTime =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        return () => {
          const endTime =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          const duration = endTime - startTime;
          this.debug(component, `${label} took ${duration.toFixed(2)}ms`);
        };
      },
    };
  }
}

// Global instance
export const debugLogger = new DebugLogger();
/**
 * Creates a simplified logger instance for a specific component.
 * @param component - The name of the component.
 * @returns A component-specific logger.
 */
export function createComponentLogger(component: string): ComponentLogger {
  return debugLogger.createComponentLogger(component);
}
