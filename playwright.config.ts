import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The cloud container ships Chromium at a fixed path; elsewhere Playwright uses its own.
const preinstalled = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PW_CHROMIUM_PATH ?? (existsSync(preinstalled) ? preinstalled : undefined);

const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: { executablePath },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: `pnpm exec next start -p ${port}`,
    port,
    reuseExistingServer: true,
    // A fresh salt per run gives the test client a new rate-limit identity.
    env: { SITE_URL: `http://localhost:${port}`, RATE_LIMIT_SALT: `e2e-${Date.now()}` },
  },
});
