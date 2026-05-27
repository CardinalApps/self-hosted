import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  deleteLocalUser,
  seedLocalUser,
} from '@cardinalapps/e2e-helpers'

// admin-web gates access at the LOGIN level, not the per-page level: users
// without `AdminApp.Login` are refused at /api/v1/login (the server rejects
// the credentials) before they can see any admin page. Assert that
// rejection via the response status — i18n-safe.

/*
 * TODO: per-action capability-gating tests are deferred.
 *
 * The e2e plan calls for these specs, none of which are writable today:
 *   - tests/users/users-capability-gating.spec.ts
 *   - tests/libraries/libraries-capability-gating.spec.ts
 *   - tests/indexing/indexing-capability-gating.spec.ts
 *   - tests/jobs/jobs-capability-gating.spec.ts
 *   - tests/surfaces/access-denied.spec.ts
 *
 * Blocker: every role in `MediaServerRoles` that grants `AdminApp.Login`
 * (owner, administrator) has wildcard `*.*` capabilities, and every role
 * that lacks some capabilities also lacks `AdminApp.Login`. There's no
 * "admin who can read but not mutate" role today, so any UI-side gate
 * (e.g. hide the Create button when Users.Create is missing) is
 * untestable — every assertion would be "the button is visible".
 *
 * Unblock when one of these lands:
 *   1. A real product role with AdminApp.Login + a constrained capability
 *      set (e.g. `technical_support`, scoped admin, read-only admin).
 *      Preferred — drives both the feature and the tests at once.
 *   2. Custom-role support, so a test can construct an arbitrary role at
 *      seed time without polluting the shared registry.
 *
 * When that happens, the gating specs all follow the same pattern: seed a
 * local user with the constrained role, log in, navigate to the gated page,
 * and assert the affordance is absent (data-testid count === 0) or
 * disabled. The existing data-testid seams on Create / Configure / Deindex
 * / Pause / Resume / Cancel are already wired for this.
 */

const seededUserIds: string[] = []

test.afterEach(async () => {
  for (const userId of seededUserIds.splice(0)) {
    await deleteLocalUser(userId).catch(() => {})
  }
})

test(
  'a newcomer-role user is refused at login (lacks AdminApp.Login)',
  { tag: '@journey:access-control-gating' },
  async ({ page }) => {
    const username = `newcomer-${randomUUID().slice(0, 8)}`
    const password = 'TestPass123!'
    const { userId } = await seedLocalUser({ username, password, role: 'newcomer' })
    seededUserIds.push(userId)

    await page.goto('/admin/login')
    await page.click('[data-testid="login-with-local-account-button"]')
    await page.fill('[data-testid="login-local-username"]', username)
    await page.fill('[data-testid="login-local-password"]', password)

    const loginPromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.click('[data-testid="login-local-submit"]')
    const loginResponse = await loginPromise
    expect(loginResponse.status()).toBeGreaterThanOrEqual(400)

    // URL stays on /admin/login — the user never makes it to a protected
    // route, and the login form stays visible.
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.locator('[data-testid="login-local-username"]')).toBeVisible()
  },
)

// Administrator IS allowed in, for contrast — useful to confirm the
// per-role distinction works both ways.
test(
  'an administrator-role user passes login and lands inside /admin/',
  { tag: '@journey:access-control-gating' },
  async ({ page }) => {
    const username = `admin-${randomUUID().slice(0, 8)}`
    const password = 'TestPass123!'
    const { userId } = await seedLocalUser({ username, password, role: 'administrator' })
    seededUserIds.push(userId)

    await page.goto('/admin/login')
    await page.click('[data-testid="login-with-local-account-button"]')
    await page.fill('[data-testid="login-local-username"]', username)
    await page.fill('[data-testid="login-local-password"]', password)

    const loginPromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.click('[data-testid="login-local-submit"]')
    const loginResponse = await loginPromise
    expect(loginResponse.status()).toBeLessThan(300)

    await page.waitForURL(
      (url) => url.pathname.startsWith('/admin') && url.pathname !== '/admin/login',
      { timeout: 10_000 },
    )
  },
)
