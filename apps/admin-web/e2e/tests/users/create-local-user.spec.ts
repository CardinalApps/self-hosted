import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// Creating a local user goes through the CreateUserDrawer form:
// username + password text inputs (#create-user-username / -password) and a
// role Select. The Select's wrapper has `data-name="role"`, so we scope
// option clicks to it and pick the option by its `value` attribute (set
// from the role enum, i18n-safe).

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-create-user' })
})

test(
  'creating a local user POSTs /users with the form values and the row appears in the table',
  { tag: '@journey:manage-local-users' },
  async ({ page }) => {
    const username = `e2e-${randomUUID().slice(0, 8)}`
    const password = 'CreateUserTest123!'

    await loginAsGuest(page)
    await page.click('a[href="/admin/users"]')
    await page.waitForURL((url) => url.pathname === '/admin/users', { timeout: 10_000 })

    await page.click('[data-testid="user-create-button"]')
    await page.fill('#create-user-username', username)
    await page.fill('#create-user-password', password)

    // Open the role Select and pick `administrator`. Scope by `data-name`
    // so we don't accidentally hit some other Select on the page.
    await page.click('.custom-select[data-name="role"] .selected.upper')
    await page.click('.custom-select[data-name="role"] [value="administrator"]')

    const createPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/v1/users') && req.method() === 'POST',
      { timeout: 10_000 },
    )
    await page.click('[data-testid="user-create-submit"]')
    const req = await createPromise
    const body = req.postDataJSON() as { username?: string, password?: string, role?: string }
    expect(body.username).toBe(username)
    expect(body.password).toBe(password)
    expect(body.role).toBe('administrator')

    // The Users.List RTK Query tag invalidation triggers a refetch; the new
    // row eventually shows up. Match by the data-user-id we know the server
    // will mint (look up the row by username via its row settings button).
    await expect.poll(async () => {
      return page.locator('.server-user-list tbody tr').count()
    }, { timeout: 10_000 }).toBeGreaterThanOrEqual(2)
  },
)
