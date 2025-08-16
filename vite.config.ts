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
        "@": path.resolve(__dirname, "."),
      },
    },
    plugins: [DownloadLive2DSDK()],
  };
});
