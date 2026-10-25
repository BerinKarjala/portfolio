import {defineConfig, devices} from '@playwright/test';
import policy from './scripts/run-browser-tests.cjs';

const managed = policy.isCI(process.env.CI) && process.env.BROWSER_SMOKE_START_SERVERS === '1';
export default defineConfig({
  testDir: './e2e-local',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 45000,
  globalTimeout: 180000,
  maxFailures: 1,
  outputDir: './test-results-local',
  reporter: [['list'], ['json', {outputFile: 'test-results-local/playwright.json'}]],
  use: {
    baseURL: 'http://localhost:3000',
    timezoneId: 'America/New_York',
    viewport: {width: 390, height: 844},
    reducedMotion: 'reduce',
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome'], viewport: {width: 390, height: 844}}}],
  // Only cloud rehearsal owns its servers. Local runs use the already-running pair.
  webServer: managed ? [
    {command: 'npm run dev -- --host localhost --port 3000 --strictPort', url: 'http://localhost:3000', reuseExistingServer: false, timeout: 120000},
    {command: 'npm run start --prefix studio13 -- --port 3333', url: 'http://localhost:3333', reuseExistingServer: false, timeout: 120000},
  ] : undefined,
});
