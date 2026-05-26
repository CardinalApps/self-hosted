import {
  test,
  expect,
  completeFirstTimeSetup,
  factoryResetMediaServer,
} from '@cardinalapps/e2e-helpers'

// When the periodic health check can't reach the server, AppBase's health
// effect dispatches a danger toast. Asserting on the toast's i18n-safe
// `data-type="danger"` attribute is the cheapest robust signal that the
// app reacted to the connection failure.

test.beforeEach(async () => {
  await factoryResetMediaServer()
  await completeFirstTimeSetup({ serverName: 'e2e-offline' })
})

test(
  'aborted /health surfaces a danger toast on the login page',
  async ({ page }) => {
    // Abort just the health check; letting the rest of the API succeed
    // means the page bootstraps far enough to render the toast layer.
    await page.route('**/api/v1/health', (route) => route.abort())

    await page.goto('/admin/login')

    // Default toast TTL is 5s, so give the assertion a tight upper bound.
    await expect(page.locator('.toast[data-type="danger"]')).toBeVisible({ timeout: 4_500 })
  },
)
