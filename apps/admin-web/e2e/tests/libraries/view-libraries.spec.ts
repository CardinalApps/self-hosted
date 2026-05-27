import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  deleteLibrary,
  loginAsGuest,
  seedLibrary,
  fixturePath,
} from '@cardinalapps/e2e-helpers'

// /admin/libraries shows a `.librariesTable` with one row per library.
// Empty state is the table's emptyMessage row.

const seededLibraryIds: string[] = []

test.afterEach(async () => {
  for (const libraryId of seededLibraryIds.splice(0)) {
    await deleteLibrary(libraryId).catch(() => {})
  }
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
    const { id, libraryId } = await seedLibrary({
      name: `e2e-music-${randomUUID().slice(0, 8)}`,
      paths: [fixturePath('music')],
    })
    seededLibraryIds.push(libraryId)

    await loginAsGuest(page)
    await page.click('a[href="/admin/libraries"]')
    await page.waitForURL((url) => url.pathname === '/admin/libraries', { timeout: 10_000 })
    await expect(page.locator('.librariesTable')).toBeVisible({ timeout: 10_000 })

    // Match the row by the just-seeded library's numeric id — isolates this
    // assertion from any unrelated libraries that might exist in the table.
    await expect(
      page.locator(`[data-testid="library-row-options"][data-library-id="${id}"]`),
    ).toBeVisible({ timeout: 5_000 })
  },
)
