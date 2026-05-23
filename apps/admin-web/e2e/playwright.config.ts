import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
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
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
