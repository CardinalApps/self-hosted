import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./global-setup.ts'),
  // Playwright artifacts (traces, screenshots, error contexts) go to /tmp so
  // they don't clutter the repo. The journey-coverage reporter still writes
  // its JSON to e2e/test-results/ (it owns that path independently).
  outputDir: '/tmp/playwright-results/admin-web',
  // 120s = up to ~60s POST /user rate-limit backoff + ~60s of headroom for the
  // flow under parallel load. Set DISABLE_RATE_LIMIT=true in the auth server's
  // env to drop suite runtime from ~2min to ~10s.
  timeout: 120_000,
  retries: 0,
  reporter: [
    ['list'],
    ['./reporters/journey-coverage-reporter.ts'],
  ],
  use: {
    baseURL: 'http://localhost:3090',
    // `on` captures a full snapshot trace for every run, not just retries —
    // makes the Playwright UI's per-step preview pane accurate for passing
    // tests too.
    trace: 'on',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
