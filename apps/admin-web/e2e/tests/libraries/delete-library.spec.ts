import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  deleteLibrary,
  loginAsGuest,
  seedLibrary,
  fixturePath,
} from '@cardinalapps/e2e-helpers'

// Confirming the delete dialog fires DELETE /api/v1/library/:id and the
// table row disappears. Assert both the request and the structural
// disappearance — two independent oracles for the same outcome.
//
// Drawer-button clicks use dispatchEvent('click') rather than page.click():
// AppBase's handle401 middleware surfaces a danger toast for every 401 —
// including the expected ones that immediately trigger a token refresh —
// and that toast layer both intercepts pointer events and (when stacked)
// pushes the drawer's delete button below the fold. `force: true` skips
// pointer-event checks but still refuses to click off-viewport elements,
// so we synthesize the click DOM event directly. Remove this workaround
// once handle401 stops toasting on refresh-triggering 401s.

const seededLibraryIds: string[] = []

test.afterEach(async () => {
  for (const libraryId of seededLibraryIds.splice(0)) {
    // Tolerate not-found: the deletion-happy-path test removes its library mid-test.
    await deleteLibrary(libraryId).catch(() => {})
  }
})

test(
  'deleting a library from the configure drawer fires DELETE /library/:id and removes the row',
  { tag: '@journey:manage-libraries' },
  async ({ page }) => {
    const { id, libraryId } = await seedLibrary({
      name: `e2e-deletable-${randomUUID().slice(0, 8)}`,
      paths: [fixturePath('music')],
    })
    seededLibraryIds.push(libraryId)

    await loginAsGuest(page)
    await page.click('a[href="/admin/libraries"]')
    await page.waitForURL((url) => url.pathname === '/admin/libraries', { timeout: 10_000 })

    const row = page.locator(`[data-testid="library-row-options"][data-library-id="${id}"]`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.click()

    // dispatchEvent('click') bypasses all actionability checks including
    // viewport — the 401 toast can push the drawer's delete button below
    // the fold, and Playwright's `force: true` still refuses to click
    // off-viewport elements.
    await page.locator('[data-testid="library-drawer-delete"]').dispatchEvent('click')
    await expect(page.locator('[data-testid="confirm-confirm"]')).toBeVisible({ timeout: 5_000 })

    const deletePromise = page.waitForRequest(
      (req) => req.url().includes(`/api/v1/library/${id}`) && req.method() === 'DELETE',
      { timeout: 10_000 },
    )
    await page.locator('[data-testid="confirm-confirm"]').dispatchEvent('click')
    await deletePromise

    // Row disappears from the table after the deletion lands.
    await expect(row).toHaveCount(0, { timeout: 5_000 })
  },
)

test(
  'cancelling the confirm dialog keeps the library intact',
  { tag: '@journey:manage-libraries' },
  async ({ page }) => {
    const { id, libraryId } = await seedLibrary({
      name: `e2e-keepable-${randomUUID().slice(0, 8)}`,
      paths: [fixturePath('music')],
    })
    seededLibraryIds.push(libraryId)

    await loginAsGuest(page)
    await page.click('a[href="/admin/libraries"]')
    await page.waitForURL((url) => url.pathname === '/admin/libraries', { timeout: 10_000 })

    const row = page.locator(`[data-testid="library-row-options"][data-library-id="${id}"]`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.click()

    let deleteRequested = false
    page.on('request', (req) => {
      if (req.url().includes(`/api/v1/library/${id}`) && req.method() === 'DELETE') {
        deleteRequested = true
      }
    })

    await page.locator('[data-testid="library-drawer-delete"]').dispatchEvent('click')
    await expect(page.locator('[data-testid="confirm-cancel"]')).toBeVisible({ timeout: 5_000 })
    await page.locator('[data-testid="confirm-cancel"]').dispatchEvent('click')

    await page.waitForTimeout(500)
    expect(deleteRequested).toBe(false)
    await expect(row).toBeVisible()
  },
)
