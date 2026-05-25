import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  seedLocalUser,
} from '@cardinalapps/e2e-helpers'

// Local users authenticate against the media server's Local IDP (no Cardinal
// Cloud round-trip). The login button is the second in the stack; tapping it
// expands an inline form with username + password inputs.
test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-local' })
})

test(
  'a local user can sign in with their username and password',
  { tag: '@journey:local-login' },
  async ({ page }) => {
    const username = `local-${randomUUID()}`
    const password = 'TestPass123!'
    await seedLocalUser({ username, password, role: 'administrator' })

    await page.goto('/admin/login')
    await expect(page.locator('[data-testid="login-with-local-account-button"]')).toBeVisible({ timeout: 10_000 })
    await page.click('[data-testid="login-with-local-account-button"]')

    await expect(page.locator('[data-testid="login-local-username"]')).toBeVisible()
    await page.fill('[data-testid="login-local-username"]', username)
    await page.fill('[data-testid="login-local-password"]', password)
    await page.click('[data-testid="login-local-submit"]')

    await page.waitForURL((url) => url.pathname.startsWith('/admin') && url.pathname !== '/admin/login', { timeout: 10_000 })
  },
)

test(
  'a wrong password keeps the user on /admin/login',
  { tag: '@journey:local-login' },
  async ({ page }) => {
    const username = `local-${randomUUID()}`
    const password = 'TestPass123!'
    await seedLocalUser({ username, password, role: 'administrator' })

    await page.goto('/admin/login')
    await page.click('[data-testid="login-with-local-account-button"]')
    await page.fill('[data-testid="login-local-username"]', username)
    await page.fill('[data-testid="login-local-password"]', 'WrongPass000!')
    await page.click('[data-testid="login-local-submit"]')

    // Login should NOT succeed: URL stays on /admin/login and the form stays
    // visible. Give the server time to respond before asserting.
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.locator('[data-testid="login-local-username"]')).toBeVisible()
  },
)
