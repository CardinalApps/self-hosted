import { v4 as uuid } from 'uuid'

import {
  test,
  expect,
  registerUser,
  deleteTestUser,
  deleteSelfHostedClaim,
  mockHomeServerInstance,
  JWT_STORAGE_KEY,
  LOGIN_BUTTON_SELECTOR,
} from '@cardinalapps/e2e-helpers'

/*
  The Cardinal Admin app registry entry has emailMustBeVerfied: true. If a
  user attempts SSO before confirming their email, the auth IDP injects the
  terminal EMAIL_MUST_BE_CONFIRMED challenge after EMAIL_AND_PASSWORD — the
  popup shows a "Confirm Your Email" message with only a Close button, no
  way to proceed.

  Per the challenge logic, this fires even before the CLAIM check, so we
  don't need to seed any claim state.
*/

test(
  'an unconfirmed user is blocked at EMAIL_MUST_BE_CONFIRMED and the popup offers only a Close button',
  { tag: ['@journey:sso-login', '@journey:sso-email-must-be-confirmed'] },
  async ({ page, testEmail, testPassword }) => {
    const instanceId = uuid()
    await mockHomeServerInstance(page, { instanceId, serverName: 'e2e-unconfirmed' })

    // registerUser leaves confirmedEmail=false; that's the state under test.
    const jwt = await registerUser(testEmail, testPassword)

    try {
      await page.goto('/admin/login')
      await page.waitForSelector(LOGIN_BUTTON_SELECTOR, { timeout: 10_000 })

      const popupPromise = page.waitForEvent('popup')
      await page.click(LOGIN_BUTTON_SELECTOR)
      const popup = await popupPromise

      await popup.waitForSelector('#login-email', { timeout: 10_000 })
      await popup.fill('#login-email', testEmail)
      await popup.fill('#login-pw', testPassword)
      await popup.getByRole('button', { name: 'Sign in', exact: true }).click()

      await expect(popup.getByRole('heading', { name: /Confirm Your Email/i }))
        .toBeVisible({ timeout: 10_000 })

      // No advance path — only a Close button.
      await expect(popup.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
      await expect(popup.getByRole('button', { name: /Claim|Authorize|Sign in/ })).toHaveCount(0)

      // Parent must NOT receive a JWT — the flow never reached check-out.
      const cloudJwt = await page.evaluate((key) => localStorage.getItem(key), JWT_STORAGE_KEY)
      expect(cloudJwt).toBeNull()
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(jwt)
    }
  },
)

test(
  'closing the EMAIL_MUST_BE_CONFIRMED popup leaves the parent unauthenticated',
  { tag: '@journey:sso-email-must-be-confirmed' },
  async ({ page, testEmail, testPassword }) => {
    const instanceId = uuid()
    await mockHomeServerInstance(page, { instanceId, serverName: 'e2e-unconfirmed-close' })

    const jwt = await registerUser(testEmail, testPassword)

    try {
      await page.goto('/admin/login')
      await page.waitForSelector(LOGIN_BUTTON_SELECTOR, { timeout: 10_000 })

      const popupPromise = page.waitForEvent('popup')
      await page.click(LOGIN_BUTTON_SELECTOR)
      const popup = await popupPromise

      await popup.waitForSelector('#login-email', { timeout: 10_000 })
      await popup.fill('#login-email', testEmail)
      await popup.fill('#login-pw', testPassword)
      await popup.getByRole('button', { name: 'Sign in', exact: true }).click()

      await expect(popup.getByRole('heading', { name: /Confirm Your Email/i }))
        .toBeVisible({ timeout: 10_000 })

      const closed = popup.waitForEvent('close', { timeout: 5_000 })
      await popup.getByRole('button', { name: 'Close', exact: true }).click()
      await closed

      const cloudJwt = await page.evaluate((key) => localStorage.getItem(key), JWT_STORAGE_KEY)
      expect(cloudJwt).toBeNull()
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(jwt)
    }
  },
)
