import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  loginAsGuest,
  seedLibrary,
  fixturePath,
} from '@cardinalapps/e2e-helpers'

// Clicking a library row's options button opens the configure drawer. As an
// admin (guest), save + delete are both enabled. We assert the drawer
// renders with its mutating controls in the correct state; the actual
// path-mutation UX goes through AddRemove which has its own custom DOM
// surface — leaving the granular form-driving to a focused spec when the
// AddRemove component gains stable seams of its own.

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-configure-library' })
})

test(
  'options-button on a seeded library opens the configure drawer with save and delete enabled',
  { tag: '@journey:manage-libraries' },
  async ({ page }) => {
    const { id } = await seedLibrary({
      name: 'e2e-configurable',
      paths: [fixturePath('music')],
    })

    await loginAsGuest(page)
    await page.click('a[href="/admin/libraries"]')
    await page.waitForURL((url) => url.pathname === '/admin/libraries', { timeout: 10_000 })

    const row = page.locator(`[data-testid="library-row-options"][data-library-id="${id}"]`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.click()

    const save = page.locator('[data-testid="library-drawer-save"]')
    const del = page.locator('[data-testid="library-drawer-delete"]')
    await expect(save).toBeVisible({ timeout: 5_000 })
    await expect(del).toBeVisible()
    await expect(save).toBeEnabled()
    await expect(del).toBeEnabled()
  },
)
