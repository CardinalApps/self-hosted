import { defineConfig, devices } from '@playwright/test'

// FTS-only config. The first-time-setup wizard suite is destructive — each
// spec factory-resets the media server back to not_setup so it can drive the
// wizard from a clean slate. Kept separate from the regular suite so a
// developer's local DB survives `pnpm test:e2e`.
export default defineConfig({
  testDir: './tests/setup',
  globalSetup: require.resolve('./global-setup-fts.ts'),
  timeout: 120_000,
  retries: 0,
  reporter: [
    ['list'],
    ['./reporters/journey-coverage-reporter.ts'],
  ],
  use: {
    baseURL: 'http://localhost:3090',
    trace: 'on',
    screenshot: 'on',
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
