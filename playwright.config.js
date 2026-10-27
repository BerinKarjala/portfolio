import { defineConfig, devices } from "@playwright/test";

// Run every behavior in Chromium. Repeat browser-sensitive editor contracts in
// Firefox/WebKit, while keeping viewport permutations in the primary browser.
// playwright.full.config.js selects the complete matrix when needed.
const crossBrowserCases = [
  /page-builder(?:-acceptance|-canvas|-export)?\.spec\.js/,
  /moon-artwork-review\.spec\.js/,
  /moon-runtime-review\.spec\.js/,
  /floating-moon-review\.spec\.js/,
  /phone preview preserves drafts, traps focus/,
  /autosave completion preserves an in-progress effect-control click/,
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    timezoneId: "America/New_York",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? {
              executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
              args: ["--no-sandbox"],
            }
          : {},
      },
    },
    { name: "firefox", grep: crossBrowserCases, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", grep: crossBrowserCases, use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
