import { puppeteerLauncher } from "@web/test-runner-puppeteer";
import { vitePlugin } from "vite-web-test-runner-plugin";

export default {
  plugins: [vitePlugin()],
  browsers: [
    puppeteerLauncher({
      launchOptions: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    }),
  ],
};
