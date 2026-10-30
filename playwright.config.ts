import { defineConfig, devices } from '@playwright/test';

// A local run can use a Chromium that is already installed. CI installs the browser that matches
// the pinned @playwright/test version with `npx playwright install --with-deps chromium`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
// PW_PORT lets two checkouts run the suite at the same time.
const port = Number(process.env.PW_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // The screen pages link to the ARIA snapshots (ADR 0006)
  expect: {
    toMatchAriaSnapshot: { pathTemplate: 'docs/reference/screens/snapshots/{arg}{ext}' },
  },
  use: {
    baseURL,
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: 'phoneLayout.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
    // RFC 0002: the rules of the phone layout, on a phone of 390 × 844 px
    {
      name: 'phone',
      testMatch: 'phoneLayout.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
  webServer: {
    command: `npx --no-install vite build && npx --no-install vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    // Opt in with PW_REUSE=1: a reused server can belong to another checkout of the project.
    reuseExistingServer: !!process.env.PW_REUSE,
    timeout: 120_000,
  },
});
