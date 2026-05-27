import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  deleteLocalUser,
  loginAsGuest,
  seedLocalUser,
} from '@cardinalapps/e2e-helpers'

// /admin/users renders a `.server-user-list` table. Each row carries a
// `current-user-badge` for the logged-in row.

const seededUserIds: string[] = []

test.afterEach(async () => {
  for (const userId of seededUserIds.splice(0)) {
    await deleteLocalUser(userId).catch(() => {})
  }
})

test(
  'the users table renders and the current-user row is marked',
  { tag: '@journey:manage-local-users' },
  async ({ page }) => {
    await loginAsGuest(page)
    // SPA-navigate to /admin/users via the nav link so we don't reload and
    // lose the memory-scoped JWT.
    await page.click('a[href="/admin/users"]')
    await page.waitForURL((url) => url.pathname === '/admin/users', { timeout: 10_000 })
    await expect(page.locator('.server-user-list')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.current-user-badge')).toBeVisible()
  },
)

test(
  'seeded local users show up in the table',
  { tag: '@journey:manage-local-users' },
  async ({ page }) => {
    // Seed 3 extra users via the dev endpoint before navigating.
    const seededRowIds: string[] = []
    for (let i = 0; i < 3; i++) {
      const { userId } = await seedLocalUser({
        username: `seeded-${randomUUID().slice(0, 8)}`,
        password: 'TestPass123!',
        role: 'standard',
      })
      seededUserIds.push(userId)
      seededRowIds.push(userId)
    }

    await loginAsGuest(page)
    await page.click('a[href="/admin/users"]')
    await page.waitForURL((url) => url.pathname === '/admin/users', { timeout: 10_000 })
    await expect(page.locator('.server-user-list')).toBeVisible({ timeout: 10_000 })

    // Match by the just-seeded userIds — robust against any other users that
    // happen to exist in the table.
    for (const userId of seededRowIds) {
      await expect(
        page.locator(`[data-testid="user-row-settings"][data-user-id="${userId}"]`),
      ).toBeVisible({ timeout: 5_000 })
    }
  },
)
