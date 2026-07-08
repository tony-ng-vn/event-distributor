/**
 * Playwright E2E config — starts dev server on 3001 with test env vars.
 * Run: npm run test:e2e
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command:
      "E2E_TEST=true E2E_TEST_SECRET=local-e2e-secret INSFORGE_PRODUCTION_URL=${INSFORGE_PRODUCTION_URL:-https://yy57ijjh.us-east.insforge.app} LUMA_FETCH_MODE=mock npm run dev -- --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
