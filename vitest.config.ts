/// <reference types="vitest" />
import path from "node:path";
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'coverage/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.spec.*',
        'vitest.config.ts',
        'vite.config.ts',
        'eslint.config.js',
        // Add any other files/directories you want to exclude from coverage
      ],
    },
  },
  resolve: {
    alias: {
      "@live2d/live2d-gate": path.resolve(__dirname, "tests/mocks/live2d-gate.mock.ts"),
      "@live2d/zip-loader": path.resolve(__dirname, "tests/mocks/empty.mock.ts"),
    },
  },
});
