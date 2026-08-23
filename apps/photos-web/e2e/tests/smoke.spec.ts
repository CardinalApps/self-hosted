import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  deleteLocalUser,
  seedLocalUser,
} from '@cardinalapps/e2e-helpers'

/*
  The one smoke spec for photos-web: the app boots under /photos, a local user
  can sign in, and the sidebar nav renders and routes. Everything is asserted
  through data-testid / structural selectors / URLs — the pages themselves are
  still placeholders and all copy is pre-localization.

  Local-account login (not guest) is used deliberately: guest auth is
  memory-scoped, so a page.goto() after the click drops the session.
*/

const seededUserIds: string[] = []

test.afterEach(async () => {
  for (const userId of seededUserIds.splice(0)) {
    await deleteLocalUser(userId).catch(() => {})
  }
})

test('the app boots, a local user can log in, and the nav renders', async ({ page }) => {
  const username = `photos-e2e-${randomUUID()}`
  const password = 'TestPass123!'
  const { userId } = await seedLocalUser({ username, password, role: 'administrator' })
  seededUserIds.push(userId)

  // An unauthenticated visit to the app root lands on the login screen.
  await page.goto('/photos')
  await page.waitForURL((url) => url.pathname === '/photos/login', { timeout: 15_000 })

  await expect(page.locator('[data-testid="login-with-local-account-button"]')).toBeVisible({ timeout: 10_000 })
  await page.click('[data-testid="login-with-local-account-button"]')
  await page.fill('[data-testid="login-local-username"]', username)
  await page.fill('[data-testid="login-local-password"]', password)
  await page.click('[data-testid="login-local-submit"]')

  await page.waitForURL((url) => url.pathname.startsWith('/photos') && url.pathname !== '/photos/login', { timeout: 15_000 })

  const navItems = page.locator('[data-testid="photos-nav-item"]')
  await expect(navItems).toHaveCount(4, { timeout: 10_000 })

  // The nav is wired to the router, not just rendered.
  await page.click('[data-testid="photos-nav-item"][data-nav-key="albums"] a')
  await page.waitForURL((url) => url.pathname === '/photos/albums', { timeout: 10_000 })
})
