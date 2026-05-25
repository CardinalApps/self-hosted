import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// /admin/roles renders two cards: .roles-list (system roles) and
// .capabilities-list (capabilities per role).

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-roles' })
})

test(
  'the roles page renders the roles + capabilities cards',
  { tag: '@journey:manage-roles' },
  async ({ page }) => {
    await loginAsGuest(page)
    await page.click('a[href="/admin/roles"]')
    await page.waitForURL((url) => url.pathname === '/admin/roles', { timeout: 10_000 })
    await expect(page.locator('.roles-list')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.capabilities-list')).toBeVisible()
  },
)
