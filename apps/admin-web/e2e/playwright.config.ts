import { defineConfig, devices } from '@playwright/test'

// Default config: the regular suite excludes first-time-setup specs. FTS
// specs factory-reset the media server, which is too disruptive to run on
// every save during local iteration — they live behind `pnpm test:e2e:fts`
// and `playwright.fts.config.ts`.
export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/setup/**'],
  globalSetup: require.resolve('./global-setup.ts'),
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
