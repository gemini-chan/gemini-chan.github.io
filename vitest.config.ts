/// <reference types="vitest" />
import path from "node:path";
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      "@live2d/live2d-gate": path.resolve(__dirname, "tests/mocks/live2d-gate.mock.ts"),
      "@live2d/zip-loader": path.resolve(__dirname, "tests/mocks/empty.mock.ts"),
    },
  },
});
