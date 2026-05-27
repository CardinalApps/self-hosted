import {
  test,
  expect,
  loginAsGuest,
} from '@cardinalapps/e2e-helpers'

// /admin/roles renders two cards: .roles-list (system roles) and
// .capabilities-list (capabilities per role).

/*
 * TODO: assign-roles spec is deferred.
 *
 * The plan calls for an `assign-roles.spec.ts` that grants / revokes a role
 * on an existing user and verifies the change persists. No admin-web UI
 * does this today — the Roles page is read-only, and UserManagementDrawer
 * shows a user's roles as a non-editable list. Role grant/revoke happens
 * either at user creation (the role Select in CreateUserDrawer) or via
 * the dev-only /dev/users/grant-role and /revoke-role endpoints.
 *
 * Write the spec when role mutation lands as a real product flow — likely
 * an editable list inside UserManagementDrawer (next to EnableDisable and
 * UpdatePassword).
 */

test(
  'the roles page renders the roles + capabilities cards',
  { tag: '@journey:manage-roles' },
  async ({ page }) => {
    await loginAsGuest(page)
    await page.click('a[href="/admin/roles"]')
    await page.waitForURL((url) => url.pathname === '/admin/roles', { timeout: 10_000 })
    await expect(page.locator('.roles-list')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.capabilities-list')).toBeVisible()
  },
)
