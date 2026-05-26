import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  loginAsGuest,
  seedLibrary,
  fixturePath,
} from '@cardinalapps/e2e-helpers'

// Confirming the delete dialog fires DELETE /api/v1/library/:id and the
// table row disappears. Assert both the request and the structural
// disappearance — two independent oracles for the same outcome.

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-delete-library' })
})

test(
  'deleting a library from the configure drawer fires DELETE /library/:id and removes the row',
  { tag: '@journey:manage-libraries' },
  async ({ page }) => {
    const { id } = await seedLibrary({
      name: 'e2e-deletable',
      paths: [fixturePath('music')],
    })

    await loginAsGuest(page)
    await page.click('a[href="/admin/libraries"]')
    await page.waitForURL((url) => url.pathname === '/admin/libraries', { timeout: 10_000 })

    const row = page.locator(`[data-testid="library-row-options"][data-library-id="${id}"]`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.click()

    await page.click('[data-testid="library-drawer-delete"]')
    await expect(page.locator('[data-testid="confirm-confirm"]')).toBeVisible({ timeout: 5_000 })

    const deletePromise = page.waitForRequest(
      (req) => req.url().includes(`/api/v1/library/${id}`) && req.method() === 'DELETE',
      { timeout: 10_000 },
    )
    await page.click('[data-testid="confirm-confirm"]')
    await deletePromise

    // Row disappears from the table after the deletion lands.
    await expect(row).toHaveCount(0, { timeout: 5_000 })
  },
)

test(
  'cancelling the confirm dialog keeps the library intact',
  { tag: '@journey:manage-libraries' },
  async ({ page }) => {
    const { id } = await seedLibrary({
      name: 'e2e-keepable',
      paths: [fixturePath('music')],
    })

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

    await page.click('[data-testid="library-drawer-delete"]')
    await expect(page.locator('[data-testid="confirm-cancel"]')).toBeVisible({ timeout: 5_000 })
    await page.click('[data-testid="confirm-cancel"]')

    await page.waitForTimeout(500)
    expect(deleteRequested).toBe(false)
    await expect(row).toBeVisible()
  },
)
