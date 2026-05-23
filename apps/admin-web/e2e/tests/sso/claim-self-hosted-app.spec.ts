import { v4 as uuid } from 'uuid'

import {
  test,
  expect,
  registerUser,
  deleteTestUser,
  confirmUserEmail,
  getUserIdFromJwt,
  deleteSelfHostedClaim,
  mockHomeServerInstance,
  JWT_STORAGE_KEY,
  LOGIN_BUTTON_SELECTOR,
} from '@cardinalapps/e2e-helpers'

/*
  Cardinal Admin's appId is registered as a non-trusted, self-hosted app. When
  a user signs in via SSO and the (instanceId, owner) pair has no claim row
  yet, the auth IDP injects the CLAIM_SELF_HOSTED_APP challenge after the
  EMAIL_AND_PASSWORD step. The user is shown a review card with a 9s
  cooldown, then taps "Claim". After that the popup checks out and the
  parent receives a JWT.

  We mock GET /api/v1/instance per test so each test owns a fresh instanceId
  (no contention with the live CMS instance), and we tear down the claim
  in finally.
*/

test(
  'first user on a fresh instance is offered the CLAIM_SELF_HOSTED_APP challenge and can claim',
  { tag: ['@journey:login', '@journey:sso-login', '@journey:sso-claim-self-hosted-app'] },
  async ({ page, testEmail, testPassword }) => {
    const instanceId = uuid()
    const serverName = `e2e-${instanceId.slice(0, 8)}`

    await mockHomeServerInstance(page, { instanceId, serverName })

    const jwt = await registerUser(testEmail, testPassword)
    await confirmUserEmail(getUserIdFromJwt(jwt))

    try {
      await page.goto('/admin/login')
      await page.waitForSelector(LOGIN_BUTTON_SELECTOR, { timeout: 10_000 })

      const popupPromise = page.waitForEvent('popup')
      await page.click(LOGIN_BUTTON_SELECTOR)
      const popup = await popupPromise
      await popup.waitForLoadState('domcontentloaded')

      await popup.waitForSelector('#login-email', { timeout: 10_000 })
      await popup.fill('#login-email', testEmail)
      await popup.fill('#login-pw', testPassword)
      await popup.getByRole('button', { name: 'Sign in', exact: true }).click()

      // The Claim view appears with a 9s cooldown gating the button.
      await expect(popup.getByRole('heading', { name: /Claim This Self-Hosted App/i }))
        .toBeVisible({ timeout: 10_000 })

      const claimButton = popup.getByRole('button', { name: /Claim/ })
      await expect(claimButton, 'Claim button should enable after the cooldown').toBeEnabled({ timeout: 15_000 })

      // Server-name fixture should be echoed in the review card so the user
      // knows which instance they're claiming.
      await expect(popup.getByText(serverName)).toBeVisible()

      await claimButton.click()
      await popup.waitForEvent('close', { timeout: 10_000 })

      const cloudJwt = await page.evaluate((key) => localStorage.getItem(key), JWT_STORAGE_KEY)
      expect(cloudJwt, 'parent should receive a cloud JWT after claim').toBeTruthy()
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(jwt)
    }
  },
)

test(
  'the CLAIM_SELF_HOSTED_APP button is disabled during the 9-second cooldown',
  { tag: '@journey:sso-claim-self-hosted-app' },
  async ({ page, testEmail, testPassword }) => {
    const instanceId = uuid()
    await mockHomeServerInstance(page, { instanceId, serverName: 'e2e-cooldown' })

    const jwt = await registerUser(testEmail, testPassword)
    await confirmUserEmail(getUserIdFromJwt(jwt))

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

      await expect(popup.getByRole('heading', { name: /Claim This Self-Hosted App/i }))
        .toBeVisible({ timeout: 10_000 })

      // Immediately the button is disabled and shows a countdown — the
      // anti-abuse delay defends against malicious popups racing the user
      // into clicking before reading the review card.
      const claimButton = popup.getByRole('button', { name: /Claim/ })
      await expect(claimButton).toBeDisabled()
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(jwt)
    }
  },
)

test(
  'closing the claim popup before claiming leaves the instance unclaimed',
  { tag: '@journey:sso-claim-self-hosted-app' },
  async ({ page, testEmail, testPassword }) => {
    const instanceId = uuid()
    await mockHomeServerInstance(page, { instanceId, serverName: 'e2e-abort' })

    const jwt = await registerUser(testEmail, testPassword)
    await confirmUserEmail(getUserIdFromJwt(jwt))

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

      await expect(popup.getByRole('heading', { name: /Claim This Self-Hosted App/i }))
        .toBeVisible({ timeout: 10_000 })

      await popup.close()

      // Parent must not be logged in if the user backed out at the claim step.
      await page.waitForTimeout(800)
      const cloudJwt = await page.evaluate((key) => localStorage.getItem(key), JWT_STORAGE_KEY)
      expect(cloudJwt).toBeNull()
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(jwt)
    }
  },
)
