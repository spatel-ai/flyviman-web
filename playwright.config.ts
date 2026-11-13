import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const ORIGIN = `http://localhost:${PORT}`;
const API_PORT = Number(process.env.API_PORT ?? 4000);
const API_ORIGIN = `http://localhost:${API_PORT}`;

/**
 * Browser tests for the customer site and the two portals.
 * Conventions: ../docs/testing-strategy.md
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: ORIGIN,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Journeys run against the real API with its mocked providers. PostgreSQL
  // and Redis must be running (`npm run db:up` in flyviman-api).
  webServer: [
    {
      // Applies migrations and seeds the local accounts before starting.
      command:
        "npm run build && npx prisma migrate deploy && node dist/seed.js && npm run start:prod",
      cwd: "../flyviman-api",
      url: `${API_ORIGIN}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        NODE_ENV: "test",
        ENABLE_DEV_TOOLS: "true",
        PORT: String(API_PORT),
        WEB_ORIGIN: ORIGIN,
        // Tests sign in and request codes far more often than a person does.
        RATE_LIMIT_AUTH_PER_MINUTE: "100000",
        RATE_LIMIT_DEFAULT_PER_MINUTE: "100000",
        RATE_LIMIT_ENQUIRY_PER_WINDOW: "100000",
        OTP_RESEND_COOLDOWN_SECONDS: "0",
        OTP_MAX_PER_HOUR: "100000",
      },
    },
    {
      command: "npm run build && npm run start",
      url: ORIGIN,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // API_PROXY=1 runs the journeys as a hosted proof of concept does:
      // the browser reaches the API through this site's /api/v1 (D-065).
      env: process.env.API_PROXY
        ? {
            NEXT_PUBLIC_API_URL: `${ORIGIN}/api/v1`,
            API_PROXY_TARGET: API_ORIGIN,
          }
        : { NEXT_PUBLIC_API_URL: `${API_ORIGIN}/api/v1` },
    },
  ],
});
