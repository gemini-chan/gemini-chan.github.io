import path from "node:path";
import { DownloadLive2DSDK } from "@proj-airi/unplugin-live2d-sdk/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    define: {
      // Note: This exposes the API key to the client.
      // This is acceptable for a client-side only demo, but not for a production application.
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      __DEBUG__: mode !== "production",
      __DEBUG_COMPONENTS__: JSON.stringify(
        mode === "development" ? env.DEBUG_COMPONENTS?.split(",") || [] : [],
      ),
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
    plugins: [DownloadLive2DSDK()],
  };
});
