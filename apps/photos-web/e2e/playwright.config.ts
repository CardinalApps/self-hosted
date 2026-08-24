import { defineConfig, devices } from '@playwright/test'

// Minimal setup: this suite exists so agents and developers can drive the real
// photos-web app while building pages. It is not a growing regression suite —
// see apps/admin-web/e2e for the fuller pattern (journeys, coverage reporter).
//
// Two servers must already be running (neither is started by Playwright):
//   1. media server on :3080 with CARDINAL_ENABLE_DEV_ENDPOINTS=true
//      (`pnpm start` in servers/media). Point its *_DIR vars at
//      servers/media/tests/fixtures/*, never at real media folders, and set
//      SQLITE_PATH to a throwaway file to keep the dev database untouched.
//   2. photos-web vite dev server on :3092 (`pnpm dev` in apps/photos-web).
export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./global-setup.ts'),
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3092',
    trace: 'on',
    screenshot: 'on',
    // Has to go through `contextOptions`, not top-level `reducedMotion`:
    // Playwright Test's `_combinedContextOptions` builder has a hardcoded
    // allowlist of fields it forwards to `browser.newContext()`, and
    // `reducedMotion` is NOT on it — so a top-level value is silently
    // dropped. The raw `contextOptions` object is spread in last, so anything
    // in here reaches the browser.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
