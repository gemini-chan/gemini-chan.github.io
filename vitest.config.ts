/// <reference types="vitest" />
import path from "node:path";
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "app"),
      "@components": path.resolve(__dirname, "components"),
      "@features": path.resolve(__dirname, "features"),
      "@services": path.resolve(__dirname, "services"),
      "@store": path.resolve(__dirname, "store"),
      "@visuals": path.resolve(__dirname, "visuals"),
      "@shared": path.resolve(__dirname, "shared"),
      "@tests": path.resolve(__dirname, "tests"),
      "@live2d": path.resolve(__dirname, "live2d"),
      "@prompts": path.resolve(__dirname, "prompts"),
    },
  },
});
