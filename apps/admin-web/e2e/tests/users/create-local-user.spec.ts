import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  deleteLocalUser,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// Creating a local user goes through the CreateUserDrawer form:
// username + password text inputs (#create-user-username / -password) and a
// role Select. The Select's wrapper has `data-name="role"`, so we scope
// option clicks to it and pick the option by its `value` attribute (set
// from the role enum, i18n-safe).

const createdUserIds: string[] = []

test.afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await deleteLocalUser(userId).catch(() => {})
  }
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

    const createRequest = page.waitForRequest(
      (req) => req.url().endsWith('/api/v1/users') && req.method() === 'POST',
      { timeout: 10_000 },
    )
    const createResponse = page.waitForResponse(
      (res) => res.url().endsWith('/api/v1/users') && res.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.click('[data-testid="user-create-submit"]')
    const req = await createRequest
    const body = req.postDataJSON() as { username?: string, password?: string, role?: string }
    expect(body.username).toBe(username)
    expect(body.password).toBe(password)
    expect(body.role).toBe('administrator')

    // Capture the new userId so afterEach can delete it — without this the
    // user would accumulate across runs against a shared dev server.
    const res = await createResponse
    const resBody = await res.json() as { userId?: string }
    if (resBody.userId) createdUserIds.push(resBody.userId)

    // The Users.List RTK Query tag invalidation triggers a refetch; the new
    // row eventually shows up under the just-minted userId.
    if (resBody.userId) {
      await expect(
        page.locator(`[data-testid="user-row-settings"][data-user-id="${resBody.userId}"]`),
      ).toBeVisible({ timeout: 10_000 })
    }
  },
)
