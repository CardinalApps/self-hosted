import {
  test,
  expect,
} from '@cardinalapps/e2e-helpers'

// When the periodic health check can't reach the server, AppBase's health
// effect dispatches a danger toast. Asserting on the toast's i18n-safe
// `data-type="danger"` attribute is the cheapest robust signal that the
// app reacted to the connection failure.

test(
  'aborted /health surfaces a danger toast on the login page',
  async ({ page }) => {
    // Abort just the health check; letting the rest of the API succeed
    // means the page bootstraps far enough to render the toast layer.
    await page.route('**/api/v1/health', (route) => route.abort())

    await page.goto('/admin/login')

    // Scope to the network-error toast by its help-code link rather than
    // `.toast[data-type="danger"]` — other unrelated danger toasts (e.g. a
    // 401 from an unauth bootstrap request) can also appear, and we only
    // care that the health-check failure produced its own toast. `.first()`
    // because the heartbeat keeps re-firing health checks every 5s and can
    // stack multiple identical toasts while we're asserting. Default toast
    // TTL is 5s.
    await expect(
      page.locator('.toast[data-type="danger"]').filter({
        has: page.locator('a[href*="ERR_CHS_0015"]'),
      }).first(),
    ).toBeVisible({ timeout: 4_500 })
  },
)
