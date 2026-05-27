import {
  test,
  expect,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// Overview renders three widgets: server, apps, active-users. Each has a
// stable structural class:
//   .server-info        — server widget body
//   .apps               — apps widget body
//   .active-users-widget — active-users widget root

test.beforeEach(async ({ page }) => {
  await loginAsGuest(page)
})

test(
  'all three overview widgets render after login',
  { tag: '@journey:view-overview' },
  async ({ page }) => {
    // loginAsGuest already landed us at /admin/ — guest login is purely
    // in-memory Redux state, so a full page.goto here would re-render the
    // login screen.
    await expect(page.locator('.server-info')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.active-users-widget')).toBeVisible()
    await expect(page.locator('.apps')).toBeVisible()
  },
)
