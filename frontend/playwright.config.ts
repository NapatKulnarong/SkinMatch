import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "__test__/e2e",
  testMatch: "**/*.spec.ts",
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
