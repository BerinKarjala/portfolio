import { defineConfig } from "@playwright/test";
import base from "../playwright.config.js";

// Exercise the storage module through Vite without adding a production test route.
export default defineConfig({
  ...base,
  outputDir: "../test-results-images",
  reporter: [["list"]],
  testDir: ".",
  testMatch: "css-studio-images.browser.js",
  use: { ...base.use, baseURL: "http://127.0.0.1:4174" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
