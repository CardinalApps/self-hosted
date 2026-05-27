import {
  test,
  expect,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// Any unrecognized path inside the scaffold falls through to the catch-all
// <AccessError code={404} /> route (AppScaffold.tsx). We assert on its
// `.access-error` container and the bracketed code span — both i18n-safe.

test(
  'an unrecognized /admin path renders the 404 access-error surface',
  async ({ page }) => {
    // Guest auth is in-memory only — a `page.goto(...)` after login wipes the
    // JWT. Stay in the same page by driving an SPA-internal navigation via
    // history.pushState + a manual popstate dispatch, which React Router v6
    // listens for. This preserves the Redux store (and the guest JWT).
    await loginAsGuest(page, '/admin')
    await page.evaluate(() => {
      window.history.pushState({}, '', '/admin/does-not-exist')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page.locator('.access-error')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.access-error .error-code')).toContainText('404')
  },
)
