// src/debug-logger.test.ts

import { expect } from "chai";
import { DebugLogger } from "@services/DebugLogger";

// Define globals for the test environment
declare global {
  var __DEBUG__: boolean;
  var __DEBUG_COMPONENTS__: string[];
}

describe("DebugLogger with ConfigurationManager", () => {
  const originalLocation = window.location;
  const originalLocalStorage = window.localStorage;
  const originalProcessEnv = process.env;

  beforeEach(() => {
    // Set default globals
    globalThis.__DEBUG__ = true;
    globalThis.__DEBUG_COMPONENTS__ = ["component-a", "component-b"];

    // Mock window.location
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, search: "" },
    });

    // Mock localStorage
    const mockStorage: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        clear: () => {
          for (const key in mockStorage) {
            delete mockStorage[key];
          }
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        key: (index: number) => Object.keys(mockStorage)[index] || null,
        get length() {
          return Object.keys(mockStorage).length;
        },
      },
    });

    // Mock process.env
    process.env = { ...originalProcessEnv };
  });

  afterEach(() => {
    // Restore original objects
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: originalLocalStorage,
    });
    process.env = originalProcessEnv;
    // @ts-ignore
    delete globalThis.__DEBUG__;
    // @ts-ignore
    delete globalThis.__DEBUG_COMPONENTS__;
  });

  it("should load default configuration correctly", () => {
    const logger = new DebugLogger();
    const config = (logger as unknown as { config: {
      enabled: boolean;
      logLevel: string;
      components: Record<string, boolean>
    } }).config;

    expect(config.enabled).to.be.true;
    expect(config.logLevel).to.equal("info");
    expect(config.components).to.deep.equal({
      "component-a": true,
      "component-b": true,
    });
  });

  it("should prioritize URL configuration over defaults", () => {
    // Set URL search parameter
    window.location.search = "?debug=component-c,component-d";

    const logger = new DebugLogger();
    const config = (logger as unknown as { config: {
      enabled: boolean;
      components: Record<string, boolean>
    } }).config;

    expect(config.enabled).to.be.true;
    expect(config.components).to.deep.equal({
      "component-a": true,
      "component-b": true,
      "component-c": true,
      "component-d": true,
    });
  });

  it("should prioritize localStorage configuration over defaults", () => {
    // Set localStorage configuration
    const localStorageConfig = {
      enabled: true,
      logLevel: "debug",
      components: { "component-e": true },
    };
    window.localStorage.setItem(
      "debugLoggerConfig",
      JSON.stringify(localStorageConfig),
    );

    const logger = new DebugLogger();
    const config = (logger as unknown as { config: {
      enabled: boolean;
      logLevel: string;
      components: Record<string, boolean>
    } }).config;

    expect(config.enabled).to.be.true;
    expect(config.logLevel).to.equal("debug");
    expect(config.components).to.deep.equal({
      "component-a": true,
      "component-b": true,
      "component-e": true,
    });
  });

  it("should prioritize environment variable configuration over defaults", () => {
    // Set environment variable
    process.env.DEBUG_ENABLED = "false";

    const logger = new DebugLogger();
    const config = (logger as unknown as { config: { enabled: boolean } }).config;

    expect(config.enabled).to.be.false;
  });
});

describe("DebugLogger", () => {
  let logger: DebugLogger;
  const originalConsole = { ...console };

  beforeEach(() => {
    // Mock console methods
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};

    logger = new DebugLogger({
      enabled: true,
      logLevel: "info",
      components: { "test-component": true },
    });
  });

  afterEach(() => {
    // Restore original console
    Object.assign(console, originalConsole);
  });

  it("should initialize with custom configuration", () => {
    const config = (logger as unknown as { config: unknown }).config as {
      logLevel: string;
      components: Record<string, unknown>;
    };
    expect(config.logLevel).to.equal("info");
    expect(config.components).to.have.property("test-component", true);
  });

  it("should not log messages below the configured log level", () => {
    let logCalled = false;
    console.log = () => {
      logCalled = true;
    };

    logger.debug("test-component", "this should not be logged");

    expect(logCalled).to.be.false;
  });

  it("should log messages at or above the configured log level", () => {
    let infoCalled = false;
    console.info = () => {
      infoCalled = true;
    };

    logger.info("test-component", "this should be logged");

    expect(infoCalled).to.be.true;
  });
  it("should not log messages for disabled components", () => {
    let infoCalled = false;
    console.info = () => {
      infoCalled = true;
    };

    logger.updateConfig({ components: { "test-component": false } });
    logger.info("test-component", "this should not be logged");

    expect(infoCalled).to.be.false;
  });

  it("should log messages for enabled components", () => {
    let infoCalled = false;
    console.info = () => {
      infoCalled = true;
    };

    logger.updateConfig({ components: { "test-component": true } });
    logger.info("test-component", "this should be logged");

    expect(infoCalled).to.be.true;
  });

  it("should format log messages correctly", () => {
    let logMessage = "";
    console.info = (message: string) => {
      logMessage = message;
    };

    logger.updateConfig({ timestamp: true, prefix: true });
    logger.info("test-component", "formatted message");

    expect(logMessage).to.include("[test-component]");
    expect(logMessage).to.include("INFO:");
    expect(logMessage).to.include("formatted message");
  });
});
