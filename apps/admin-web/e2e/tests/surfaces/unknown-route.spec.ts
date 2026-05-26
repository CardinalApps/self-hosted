import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// Any unrecognized path inside the scaffold falls through to the catch-all
// <AccessError code={404} /> route (AppScaffold.tsx). We assert on its
// `.access-error` container and the bracketed code span — both i18n-safe.

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-unknown-route' })
})

test(
  'an unrecognized /admin path renders the 404 access-error surface',
  async ({ page }) => {
    await loginAsGuest(page)
    await page.goto('/admin/does-not-exist')
    await expect(page.locator('.access-error')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.access-error .error-code')).toContainText('404')
  },
)
