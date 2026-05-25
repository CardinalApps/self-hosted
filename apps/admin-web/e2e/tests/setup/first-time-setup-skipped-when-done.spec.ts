import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
} from '@cardinalapps/e2e-helpers'

// Once the server is configured, /admin/setup is a dead route — the wizard
// short-circuits and bounces the user to /admin/login.

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-setup' })
})

test(
  'visiting /admin/setup on a configured server redirects to /admin/login',
  { tag: '@journey:first-time-setup' },
  async ({ page }) => {
    await page.goto('/admin/setup')
    await page.waitForURL((url) => url.pathname === '/admin/login', { timeout: 10_000 })
  },
)
