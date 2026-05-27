import {
  test,
  expect,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// CreateLibraryDrawer's handleCreate early-returns when no directories are
// selected — and the empty-state Drawer.Section renders an Alert as the
// visible signal. Drive the validation path without DirectoryTree
// interaction; the seed-and-render path is exercised by seedLibrary in
// view-libraries.spec.ts.

test(
  'opening the create drawer with no directories selected shows the warning alert and no POST /library fires',
  { tag: '@journey:manage-libraries' },
  async ({ page }) => {
    await loginAsGuest(page)
    await page.click('a[href="/admin/libraries"]')
    await page.waitForURL((url) => url.pathname === '/admin/libraries', { timeout: 10_000 })

    let createRequested = false
    page.on('request', (req) => {
      if (req.url().endsWith('/api/v1/library') && req.method() === 'POST') {
        createRequested = true
      }
    })

    await page.click('[data-testid="library-create-button"]')
    // Warning alert is the structural signal that the drawer detected the
    // empty selection. `.alert.warning` is i18n-safe.
    await expect(page.locator('.alert.warning')).toBeVisible({ timeout: 5_000 })

    await page.fill('#create-library-name', 'My Library')
    await page.click('[data-testid="library-create-submit"]')

    // Give the form a moment to (not) fire the request, then assert.
    await page.waitForTimeout(500)
    expect(createRequested).toBe(false)
  },
)
