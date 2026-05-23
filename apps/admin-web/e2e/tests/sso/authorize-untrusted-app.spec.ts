import { v4 as uuid } from 'uuid'

import {
  test,
  expect,
  registerUser,
  deleteTestUser,
  confirmUserEmail,
  getUserIdFromJwt,
  createSelfHostedClaim,
  deleteSelfHostedClaim,
  mockHomeServerInstance,
  JWT_STORAGE_KEY,
  LOGIN_BUTTON_SELECTOR,
} from '@cardinalapps/e2e-helpers'

/*
  When a self-hosted instance has already been claimed by some other user,
  a different user signing in via SSO must explicitly authorize the app to
  receive their identity. The challenge after EMAIL_AND_PASSWORD becomes
  AUTHORIZE_UNTRUSTED_APP, surfaced as a review-and-consent card listing
  the permission scopes the app will receive.

  We seed the (instanceId -> ownerUserId) claim via the dev endpoint so
  the test owns both the owner identity and the visiting identity.
*/

test(
  'a non-owner is offered the AUTHORIZE_UNTRUSTED_APP challenge and can authorize',
  { tag: ['@journey:login', '@journey:sso-login', '@journey:sso-authorize-untrusted-app'] },
  async ({ page, testEmail, testPassword }) => {
    const instanceId = uuid()
    await mockHomeServerInstance(page, { instanceId, serverName: 'e2e-authorize' })

    // Owner: signs up, confirms, claims the instance via the dev endpoint.
    const ownerEmail = `e2e-owner-${uuid()}@test.invalid`
    const ownerJwt = await registerUser(ownerEmail, testPassword)
    const ownerUserId = getUserIdFromJwt(ownerJwt)
    await confirmUserEmail(ownerUserId)
    await createSelfHostedClaim(instanceId, ownerUserId)

    // Visitor: a different user signs in via the admin SSO button.
    const visitorJwt = await registerUser(testEmail, testPassword)
    await confirmUserEmail(getUserIdFromJwt(visitorJwt))

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

      // Review-and-consent card surfaces with the Authorize button gated by
      // the same 9s cooldown as the Claim view.
      await expect(popup.getByRole('button', { name: /Authorize/ }))
        .toBeVisible({ timeout: 10_000 })
      // Permission scopes are listed so the visitor knows what they're giving up.
      await expect(popup.getByText('user_email_confirmed')).toBeVisible()

      const authorizeButton = popup.getByRole('button', { name: /Authorize/ })
      await expect(authorizeButton, 'Authorize button should enable after cooldown').toBeEnabled({ timeout: 15_000 })
      await authorizeButton.click()

      await popup.waitForEvent('close', { timeout: 10_000 })

      const cloudJwt = await page.evaluate((key) => localStorage.getItem(key), JWT_STORAGE_KEY)
      expect(cloudJwt, 'visitor should receive a cloud JWT after authorizing').toBeTruthy()
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(visitorJwt)
      await deleteTestUser(ownerJwt)
    }
  },
)

test(
  'closing the authorize popup before authorizing does not log the visitor in',
  { tag: '@journey:sso-authorize-untrusted-app' },
  async ({ page, testEmail, testPassword }) => {
    const instanceId = uuid()
    await mockHomeServerInstance(page, { instanceId, serverName: 'e2e-authorize-abort' })

    const ownerEmail = `e2e-owner-${uuid()}@test.invalid`
    const ownerJwt = await registerUser(ownerEmail, testPassword)
    const ownerUserId = getUserIdFromJwt(ownerJwt)
    await confirmUserEmail(ownerUserId)
    await createSelfHostedClaim(instanceId, ownerUserId)

    const visitorJwt = await registerUser(testEmail, testPassword)
    await confirmUserEmail(getUserIdFromJwt(visitorJwt))

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

      await expect(popup.getByRole('button', { name: /Authorize/ })).toBeVisible({ timeout: 10_000 })
      await popup.close()

      await page.waitForTimeout(800)
      const cloudJwt = await page.evaluate((key) => localStorage.getItem(key), JWT_STORAGE_KEY)
      expect(cloudJwt).toBeNull()
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(visitorJwt)
      await deleteTestUser(ownerJwt)
    }
  },
)

test(
  'an already-authorized visitor skips the AUTHORIZE challenge on a second sign-in',
  { tag: '@journey:sso-authorize-untrusted-app' },
  async ({ page, testEmail, testPassword }) => {
    const instanceId = uuid()
    await mockHomeServerInstance(page, { instanceId, serverName: 'e2e-reentry' })

    const ownerEmail = `e2e-owner-${uuid()}@test.invalid`
    const ownerJwt = await registerUser(ownerEmail, testPassword)
    const ownerUserId = getUserIdFromJwt(ownerJwt)
    await confirmUserEmail(ownerUserId)
    await createSelfHostedClaim(instanceId, ownerUserId)

    const visitorJwt = await registerUser(testEmail, testPassword)
    await confirmUserEmail(getUserIdFromJwt(visitorJwt))

    try {
      // First sign-in: visitor authorizes the app.
      await page.goto('/admin/login')
      await page.waitForSelector(LOGIN_BUTTON_SELECTOR, { timeout: 10_000 })

      const popup1Promise = page.waitForEvent('popup')
      await page.click(LOGIN_BUTTON_SELECTOR)
      const popup1 = await popup1Promise

      await popup1.waitForSelector('#login-email', { timeout: 10_000 })
      await popup1.fill('#login-email', testEmail)
      await popup1.fill('#login-pw', testPassword)
      await popup1.getByRole('button', { name: 'Sign in', exact: true }).click()

      const authorizeButton = popup1.getByRole('button', { name: /Authorize/ })
      await expect(authorizeButton).toBeEnabled({ timeout: 15_000 })
      await authorizeButton.click()
      await popup1.waitForEvent('close', { timeout: 10_000 })

      // Clear parent's logged-in state and start the SSO flow again.
      await page.evaluate((key) => localStorage.removeItem(key), JWT_STORAGE_KEY)
      await page.goto('/admin/login')
      await page.waitForSelector(LOGIN_BUTTON_SELECTOR, { timeout: 10_000 })

      const popup2Promise = page.waitForEvent('popup')
      await page.click(LOGIN_BUTTON_SELECTOR)
      const popup2 = await popup2Promise

      await popup2.waitForSelector('#login-email', { timeout: 10_000 })
      await popup2.fill('#login-email', testEmail)
      await popup2.fill('#login-pw', testPassword)
      await popup2.getByRole('button', { name: 'Sign in', exact: true }).click()

      // The AppAuthorization persists across logins — the popup runs straight
      // through check-out without ever rendering the Authorize button. We
      // assert by close-event-before-deadline; if AUTHORIZE had fired, the
      // user would have to click and the 9s cooldown would push us past 10s.
      const popup2ClosedQuickly = await popup2.waitForEvent('close', { timeout: 8_000 })
        .then(() => true)
        .catch(() => false)
      expect(popup2ClosedQuickly, 'second sign-in should not surface AUTHORIZE again').toBe(true)

      const cloudJwt = await page.evaluate((key) => localStorage.getItem(key), JWT_STORAGE_KEY)
      expect(cloudJwt).toBeTruthy()
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(visitorJwt)
      await deleteTestUser(ownerJwt)
    }
  },
)
