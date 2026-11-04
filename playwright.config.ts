import { defineConfig } from "@playwright/test";
const externalURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalURL || `http://127.0.0.1:${process.env.PORT || 3000}`;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL, channel: process.env.CI ? undefined : "chrome", headless: true, trace: "retain-on-failure" },
  webServer: externalURL ? undefined : { command: "npm run start", url: baseURL, reuseExistingServer: !process.env.CI, timeout: 20_000 },
});
