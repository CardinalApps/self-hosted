import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  seedLocalUser,
} from '@cardinalapps/e2e-helpers'

// admin-web gates access at the LOGIN level, not the per-page level: users
// without `AdminApp.Login` are refused at /api/v1/login (the server rejects
// the credentials) before they can see any admin page. Assert that
// rejection via the response status — i18n-safe.

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-gating' })
})

test(
  'a newcomer-role user is refused at login (lacks AdminApp.Login)',
  { tag: '@journey:access-control-gating' },
  async ({ page }) => {
    const username = `newcomer-${randomUUID().slice(0, 8)}`
    const password = 'TestPass123!'
    await seedLocalUser({ username, password, role: 'newcomer' })

    await page.goto('/admin/login')
    await page.click('[data-testid="login-with-local-account-button"]')
    await page.fill('[data-testid="login-local-username"]', username)
    await page.fill('[data-testid="login-local-password"]', password)

    const loginPromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.click('[data-testid="login-local-submit"]')
    const loginResponse = await loginPromise
    expect(loginResponse.status()).toBeGreaterThanOrEqual(400)

    // URL stays on /admin/login — the user never makes it to a protected
    // route, and the login form stays visible.
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.locator('[data-testid="login-local-username"]')).toBeVisible()
  },
)

// Administrator IS allowed in, for contrast — useful to confirm the
// per-role distinction works both ways.
test(
  'an administrator-role user passes login and lands inside /admin/',
  { tag: '@journey:access-control-gating' },
  async ({ page }) => {
    const username = `admin-${randomUUID().slice(0, 8)}`
    const password = 'TestPass123!'
    await seedLocalUser({ username, password, role: 'administrator' })

    await page.goto('/admin/login')
    await page.click('[data-testid="login-with-local-account-button"]')
    await page.fill('[data-testid="login-local-username"]', username)
    await page.fill('[data-testid="login-local-password"]', password)

    const loginPromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.click('[data-testid="login-local-submit"]')
    const loginResponse = await loginPromise
    expect(loginResponse.status()).toBeLessThan(300)

    await page.waitForURL(
      (url) => url.pathname.startsWith('/admin') && url.pathname !== '/admin/login',
      { timeout: 10_000 },
    )
  },
)
