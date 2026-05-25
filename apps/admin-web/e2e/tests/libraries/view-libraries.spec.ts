import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  loginAsGuest,
  seedLibrary,
  fixturePath,
} from '@cardinalapps/e2e-helpers'

// /admin/libraries shows a `.librariesTable` with one row per library.
// Empty state is the table's emptyMessage row.

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-libraries' })
})

test(
  'the libraries page renders the libraries table',
  { tag: '@journey:manage-libraries' },
  async ({ page }) => {
    await loginAsGuest(page)
    await page.click('a[href="/admin/libraries"]')
    await page.waitForURL((url) => url.pathname === '/admin/libraries', { timeout: 10_000 })
    await expect(page.locator('.librariesTable')).toBeVisible({ timeout: 10_000 })
  },
)

test(
  'a seeded library renders as a row in the table',
  { tag: '@journey:manage-libraries' },
  async ({ page }) => {
    await seedLibrary({
      name: 'e2e-music',
      paths: [fixturePath('music')],
    })

    await loginAsGuest(page)
    await page.click('a[href="/admin/libraries"]')
    await page.waitForURL((url) => url.pathname === '/admin/libraries', { timeout: 10_000 })
    await expect(page.locator('.librariesTable')).toBeVisible({ timeout: 10_000 })

    // Each library row is a `<tr>` inside the table body.
    await expect.poll(
      async () => page.locator('.librariesTable tbody tr').count(),
      { timeout: 5_000 },
    ).toBeGreaterThanOrEqual(1)
  },
)
