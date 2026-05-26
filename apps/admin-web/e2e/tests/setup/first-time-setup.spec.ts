import {
  test,
  expect,
  factoryResetMediaServer,
} from '@cardinalapps/e2e-helpers'

// Counterpart to first-time-setup-skipped-when-done.spec.ts:
// on a fresh server, /admin/setup should render the wizard rather than
// bouncing to /admin/login. The full step-by-step walkthrough — with the
// SSO popup in step 4 — is a substantial follow-up because driving the
// cloud-SSO flow requires the same machinery the sso/claim-* specs use,
// plus per-step `data-testid` seams on the next/prev buttons. This spec
// covers the "did the wizard mount at all" half so the route at least has
// e2e coverage today.

test.beforeEach(async () => {
  await factoryResetMediaServer()
})

test(
  'visiting /admin/setup on a fresh server renders the wizard',
  { tag: '@journey:first-time-setup' },
  async ({ page }) => {
    await page.goto('/admin/setup')
    await expect(page.locator('.firstTimeSetup')).toBeVisible({ timeout: 10_000 })
    // URL stays on /admin/setup (no bounce to /admin/login since health
    // came back as not_setup).
    await expect(page).toHaveURL(/\/admin\/setup/)
  },
)
