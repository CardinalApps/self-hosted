import {
  test,
  expect,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// /admin/indexing renders six cards (NewRun + OverallProgress + MediaProgress
// + Files + Folders + RunsHistory). The data-testid seams on the power button
// and state indicator are i18n-safe and confirm both rendered.

test(
  'the indexing page renders its primary sections',
  { tag: '@journey:run-indexing' },
  async ({ page }) => {
    await loginAsGuest(page)
    await page.click('a[href="/admin/indexing"]')
    await page.waitForURL((url) => url.pathname === '/admin/indexing', { timeout: 10_000 })

    await expect(page.locator('[data-testid="indexing-power-button"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="indexing-state-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="media-progress-music"]')).toBeVisible()
    await expect(page.locator('[data-testid="media-progress-photos"]')).toBeVisible()
    await expect(page.locator('[data-testid="media-progress-movies"]')).toBeVisible()
    await expect(page.locator('[data-testid="media-progress-tv"]')).toBeVisible()
    await expect(page.locator('[data-testid="deindex-media-button"]')).toBeVisible()
  },
)
