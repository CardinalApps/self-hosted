import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
} from '@cardinalapps/e2e-helpers'

// Guest login is the fastest path to an admin-logged-in browser. It's the
// third login button in the stack, identified by data-testid (added in the
// same change that introduced these specs). Reset the server before each
// test so the guest account is in a known state.
test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-guest' })
})

test(
  'clicking the guest button on /admin/login lands the user at /admin',
  { tag: '@journey:guest-login' },
  async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('[data-testid="login-with-guest-button"]')).toBeVisible({ timeout: 10_000 })
    await page.click('[data-testid="login-with-guest-button"]')
    await page.waitForURL((url) => url.pathname === '/admin' || url.pathname === '/admin/', { timeout: 10_000 })
  },
)
