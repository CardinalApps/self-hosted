import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  loginAsGuest,
  seedLocalUser,
} from '@cardinalapps/e2e-helpers'

// /admin/users renders a `.server-user-list` table. Each row carries a
// `current-user-badge` for the logged-in row.

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-users' })
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
    for (let i = 0; i < 3; i++) {
      await seedLocalUser({
        username: `seeded-${randomUUID().slice(0, 8)}`,
        password: 'TestPass123!',
        role: 'standard',
      })
    }

    await loginAsGuest(page)
    await page.click('a[href="/admin/users"]')
    await page.waitForURL((url) => url.pathname === '/admin/users', { timeout: 10_000 })
    await expect(page.locator('.server-user-list')).toBeVisible({ timeout: 10_000 })

    // Guest row + 3 seeded users + (possibly server owner) = at least 4 rows.
    await expect.poll(
      async () => page.locator('.server-user-list tbody tr').count(),
      { timeout: 5_000 },
    ).toBeGreaterThanOrEqual(4)
  },
)
