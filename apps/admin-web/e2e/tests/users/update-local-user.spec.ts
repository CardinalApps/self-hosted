import { randomUUID } from 'node:crypto'

import type { Page } from '@playwright/test'

import {
  test,
  expect,
  deleteLocalUser,
  loginAsGuest,
  seedLocalUser,
} from '@cardinalapps/e2e-helpers'

// User-management drawer holds three independent mutations against
// PATCH /api/v1/users/:id: disable (body.enabled=false), enable
// (body.enabled=true), and update-password (body.password=...).
// Each spec drives one of them and asserts on the outgoing request.

const seededUserIds: string[] = []

test.afterEach(async () => {
  for (const userId of seededUserIds.splice(0)) {
    await deleteLocalUser(userId).catch(() => {})
  }
})

async function openSettingsDrawerFor(page: Page, userId: string) {
  await loginAsGuest(page)
  await page.click('a[href="/admin/users"]')
  await page.waitForURL((url: URL) => url.pathname === '/admin/users', { timeout: 10_000 })

  const row = page.locator(`[data-testid="user-row-settings"][data-user-id="${userId}"]`)
  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.click()
}

test(
  'disabling an enabled user PATCHes /users/:id with enabled=false',
  { tag: '@journey:manage-local-users' },
  async ({ page }) => {
    const username = `e2e-disable-${randomUUID().slice(0, 8)}`
    const { userId } = await seedLocalUser({
      username,
      password: 'DisableMe123!',
      role: 'administrator',
    })
    seededUserIds.push(userId)
    await openSettingsDrawerFor(page, userId)

    const patchPromise = page.waitForRequest(
      (req) => req.url().endsWith(`/api/v1/users/${userId}`) && req.method() === 'PATCH',
      { timeout: 10_000 },
    )
    await page.click('[data-testid="user-disable-button"]')
    await page.click('[data-testid="confirm-confirm"]')

    const req = await patchPromise
    expect((req.postDataJSON() as { enabled?: boolean }).enabled).toBe(false)
  },
)

test(
  'updating the password PATCHes /users/:id with the new password',
  { tag: '@journey:manage-local-users' },
  async ({ page }) => {
    const username = `e2e-pw-${randomUUID().slice(0, 8)}`
    const { userId } = await seedLocalUser({
      username,
      password: 'OldPass123!',
      role: 'administrator',
    })
    seededUserIds.push(userId)
    await openSettingsDrawerFor(page, userId)

    await page.click('[data-testid="user-update-password-trigger"]')
    await page.fill('#password', 'NewPass456!')

    const patchPromise = page.waitForRequest(
      (req) => req.url().endsWith(`/api/v1/users/${userId}`) && req.method() === 'PATCH',
      { timeout: 10_000 },
    )
    await page.click('[data-testid="user-update-password-submit"]')

    const req = await patchPromise
    expect((req.postDataJSON() as { password?: string }).password).toBe('NewPass456!')
  },
)

test(
  'the disable button is disabled on the owner / current-user row (with a data-disabled-reason marker)',
  { tag: '@journey:manage-local-users' },
  async ({ page }) => {
    await loginAsGuest(page)
    await page.click('a[href="/admin/users"]')
    await page.waitForURL((url) => url.pathname === '/admin/users', { timeout: 10_000 })

    // Find the row marked with .current-user-badge — that's the guest we just
    // logged in as. The disable button on this row should be disabled with
    // reason "self" (or "owner" if the guest also holds the owner role).
    // Targeting by badge — rather than "first row" — is robust to whatever
    // other users happen to exist in the shared dev DB.
    const currentUserRow = page.locator('.server-user-list tbody tr').filter({ has: page.locator('.current-user-badge') })
    await expect(currentUserRow).toHaveCount(1, { timeout: 10_000 })
    await currentUserRow.locator('[data-testid="user-row-settings"]').click()

    const disable = page.locator('[data-testid="user-disable-button"]')
    await expect(disable).toBeVisible()
    await expect(disable).toBeDisabled()
    // The marker disambiguates "disabled because owner" from "disabled
    // because self" — both render the same affordance otherwise.
    await expect(disable).toHaveAttribute('data-disabled-reason', /(owner|self)/)
  },
)
