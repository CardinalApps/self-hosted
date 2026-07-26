import { randomUUID } from 'node:crypto'

import type { Page } from '@playwright/test'

import {
  test,
  expect,
  // Cloud / auth helpers
  registerUser,
  confirmUserEmail,
  deleteTestUser,
  getUserIdFromJwt,
  createSelfHostedClaim,
  getSelfHostedClaim,
  deleteSelfHostedClaim,
  // Media-server lifecycle + seeding
  factoryResetMediaServer,
  completeFirstTimeSetup,
  isFirstTimeSetupDone,
  getMediaServerOption,
  getLastClaimAttempt,
  seedLocalUser,
  seedLibrary,
  deleteLibrary,
  fixturePath,
  loginAsGuest,
  // Wizard helpers
  clickWelcomeStart,
  pickTheme,
  setServerNameAndContinue,
  completeSetupSSO,
  setTelemetryAgreement,
  clickSetupNext,
  submitSetup,
} from '@cardinalapps/e2e-helpers'

/*
  Factory reset, driven the way an administrator drives it: settings panel →
  Advanced → the danger button → type the phrase.

  The reset wipes media data, every account and everything accounts own,
  reseeds default settings, recreates the guest account, flips
  first_time_setup_done back to false, and mints a NEW instance_id. That last
  one is load-bearing: the cloud keys a self-hosted claim by instance ID and
  has no endpoint to release one, so a reset server that kept its ID would be
  answered `400 This instance has already been claimed` forever.

  The client half of the flow closes the settings panel, dispatches
  globalActions.RESET (which drops every stored JWT) and navigates to
  /admin/setup.
*/

const MEDIA_API = 'http://localhost:3080/api/v1'

// The Media Server compares this against ResetValidationPhrase.FACTORY verbatim.
const VALIDATION_PHRASE = 'Factory reset'

const HOME_SERVER_JWT_KEY = '@cardinal/home_server_user_tolkien'
const CLOUD_JWT_KEY = '@cardinal/cloud_user_tolkien'

const TEST_PASSWORD = 'TestPass123!'

type PublicUser = { userId?: string, username?: string, designation?: string }

/*
  The login screen's unauthenticated account list. It is the only way to read
  the account table without a session, which is exactly the state a reset
  leaves behind — every account that could have authenticated the read is gone.
*/
async function fetchPublicUsers(): Promise<PublicUser[]> {
  const res = await fetch(`${MEDIA_API}/users/public`, { headers: { 'cardinal-app': 'admin' } })
  expect(res.status, 'GET /users/public should answer the login screen').toBeLessThan(300)
  return await res.json() as PublicUser[]
}

// Walk a logged-in admin from the dashboard to the factory-reset control.
async function openAdvancedSettings(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu-avatar"]')
  await page.click('[data-testid="user-menu-settings"]')
  await page.click('[data-testid="settings-tab-advanced"]')
  await expect(page.locator('[data-testid="factory-reset-button"]')).toBeVisible({ timeout: 5_000 })
}

test(
  'the admin resets from the settings panel: a wrong phrase fires nothing, the exact phrase wipes the server',
  { tag: '@journey:factory-reset' },
  async ({ page }) => {
    await factoryResetMediaServer()
    await completeFirstTimeSetup({ serverName: `e2e-${randomUUID().slice(0, 8)}` })

    const instanceIdBefore = await getMediaServerOption('instance_id') as string
    const doomedUsername = `wiped-${randomUUID().slice(0, 8)}`
    await seedLocalUser({ username: doomedUsername, password: TEST_PASSWORD, role: 'media_apps_user' })
    const { libraryId } = await seedLibrary({
      name: `e2e-${randomUUID().slice(0, 8)}`,
      paths: [fixturePath('music')],
    })

    // Guest is a built-in administrator, so it carries MediaServer.FactoryReset.
    await loginAsGuest(page)
    await openAdvancedSettings(page)
    await expect(page.locator('[data-testid="factory-reset-button"]')).toBeEnabled()

    // Pin the starting state, so the post-reset "no JWT" assertion below is
    // proving the reset dropped it rather than that it was never there.
    const jwtBeforeReset = await page.evaluate((key) => localStorage.getItem(key), HOME_SERVER_JWT_KEY)
    expect(jwtBeforeReset, 'the logged-in admin should be holding a home-server JWT').toBeTruthy()

    let resetRequested = false
    page.on('request', (req) => {
      if (req.url().endsWith('/api/v1/reset') && req.method() === 'POST') {
        resetRequested = true
      }
    })

    await page.click('[data-testid="factory-reset-button"]')
    await expect(page.locator('[data-testid="confirm-input"]')).toBeVisible({ timeout: 5_000 })

    /*
      A near-miss phrase. Confirm compares the typed text to `mustEnterText`
      and simply does nothing when they differ, so the modal has to still be
      standing and no request may have left the browser.
    */
    await page.fill('[data-testid="confirm-input"]', VALIDATION_PHRASE.toLowerCase())
    await page.click('[data-testid="confirm-confirm"]')
    await expect(page.locator('[data-testid="confirm-input"]')).toBeVisible()
    expect(resetRequested, 'a mistyped phrase must not reach the server').toBe(false)

    // The reset itself runs a multi-step transaction over every table, so give
    // the response room beyond the default action timeout.
    const resetResponsePromise = page.waitForResponse(
      (res) => res.url().endsWith('/api/v1/reset') && res.request().method() === 'POST',
      { timeout: 60_000 },
    )
    await page.fill('[data-testid="confirm-input"]', VALIDATION_PHRASE)
    await page.click('[data-testid="confirm-confirm"]')

    const resetResponse = await resetResponsePromise
    expect(resetResponse.status()).toBeLessThan(300)
    expect(resetResponse.request().postDataJSON()).toMatchObject({
      type: 'factory',
      validationString: VALIDATION_PHRASE,
    })

    // --- Client lands back at the start line, holding no credentials --------

    await page.waitForURL((url) => url.pathname === '/admin/setup', { timeout: 15_000 })
    await expect(page.locator('.settings-panel')).toHaveCount(0, { timeout: 10_000 })

    const storedTokens = await page.evaluate(
      ([homeKey, cloudKey]) => ({
        home: localStorage.getItem(homeKey),
        cloud: localStorage.getItem(cloudKey),
      }),
      [HOME_SERVER_JWT_KEY, CLOUD_JWT_KEY],
    )
    expect(storedTokens.home, 'the home-server JWT should be gone').toBeNull()
    expect(storedTokens.cloud, 'the cloud JWT should be gone').toBeNull()

    // --- Server is back to a fresh install ---------------------------------

    expect(await isFirstTimeSetupDone()).toBe(false)

    const instanceIdAfter = await getMediaServerOption('instance_id') as string
    expect(instanceIdAfter, 'the reset must mint a new instance ID').not.toBe(instanceIdBefore)

    const publicUsers = await fetchPublicUsers()
    expect(publicUsers.some((user) => user.designation === 'guest_account')).toBe(true)
    expect(publicUsers.some((user) => user.username === doomedUsername)).toBe(false)

    /*
      There is no read-only probe for a library outside the owning user's
      session, and the account that owned this one no longer exists. The dev
      delete endpoint looks the row up by libraryId with no user scoping and
      404s when it is missing, which makes it a global existence check.
    */
    await expect(deleteLibrary(libraryId)).rejects.toThrow(/404/)
  },
)

test(
  'a server whose instance was already claimed in the cloud can be claimed again after a reset',
  { tag: ['@journey:factory-reset', '@journey:first-time-setup-claim-side-effect'] },
  async ({ page, testEmail, testPassword }) => {
    await factoryResetMediaServer()
    const claimedInstanceId = await getMediaServerOption('instance_id') as string

    const jwt = await registerUser(testEmail, testPassword)
    const userId = getUserIdFromJwt(jwt)
    await confirmUserEmail(userId)

    let resetInstanceId = ''

    try {
      // Stand in for "this server has been set up once already": the cloud is
      // holding a claim row against the instance ID the server has right now.
      await createSelfHostedClaim(claimedInstanceId, userId)

      await factoryResetMediaServer()
      resetInstanceId = await getMediaServerOption('instance_id') as string

      // The whole point. Before the reset regenerated this, the second setup
      // below could never write a claim.
      expect(resetInstanceId, 'the reset must mint a new instance ID').not.toBe(claimedInstanceId)

      await page.goto('/admin/setup')
      await clickWelcomeStart(page)
      await pickTheme(page, 'light')
      await setServerNameAndContinue(page, `e2e-${randomUUID().slice(0, 8)}`)
      await completeSetupSSO(page, { email: testEmail, password: testPassword })
      await clickSetupNext(page, 'login')
      await setTelemetryAgreement(page, false)
      await clickSetupNext(page, 'usage-data')
      await clickSetupNext(page, 'privacy')
      await clickSetupNext(page, 'help')
      await submitSetup(page)

      await page.waitForURL((url) => !url.pathname.includes('/admin/setup'), { timeout: 15_000 })

      // ClaimService fires the claim POST asynchronously off CREATE_OWNER, so
      // poll rather than trusting the first read.
      let claim = await getSelfHostedClaim(resetInstanceId)
      const deadline = Date.now() + 5_000
      while (!claim && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        claim = await getSelfHostedClaim(resetInstanceId)
      }

      if (!claim) {
        // ClaimService swallows the rejection after logging it, so without
        // this the failure would read as a bare "got null".
        const lastAttempt = await getLastClaimAttempt()
        expect(
          claim,
          `POST /setup should have claimed the post-reset instance ${resetInstanceId}. Last claim attempt from the media server: ${JSON.stringify(lastAttempt, null, 2)}`,
        ).not.toBeNull()
      }

      expect(claim?.instanceId).toBe(resetInstanceId)
      expect(claim?.userId).toBe(userId)
    } finally {
      await deleteSelfHostedClaim(claimedInstanceId)
      if (resetInstanceId) {
        await deleteSelfHostedClaim(resetInstanceId)
      }
      await deleteTestUser(jwt)
    }
  },
)

/*
  The UI half of this gate — the button renders disabled via
  useHasCapability('MediaServer.FactoryReset') — cannot be driven in a browser
  yet, for the reason spelled out in tests/access-control/users-page-gated.spec.ts:
  every role that grants AdminApp.Login also grants `*.*`, so there is no user
  who can reach the settings panel and lack the capability. Until a constrained
  admin role exists, the server's answer is the assertion that means anything.
*/
test(
  'a user without MediaServer.FactoryReset is refused by POST /reset',
  { tag: ['@journey:factory-reset', '@journey:access-control-gating'] },
  async () => {
    await factoryResetMediaServer()
    await completeFirstTimeSetup({ serverName: `e2e-${randomUUID().slice(0, 8)}` })

    const username = `no-reset-${randomUUID().slice(0, 8)}`
    await seedLocalUser({ username, password: TEST_PASSWORD, role: 'media_apps_user' })

    /*
      media_apps_user has no AdminApp.Login, so its token has to be minted by an
      app it is allowed into. The capability check on POST /reset reads the
      user's roles and ignores which app asked.
    */
    const loginRes = await fetch(`${MEDIA_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cardinal-app': 'music' },
      body: JSON.stringify({ username, password: TEST_PASSWORD }),
    })
    expect(loginRes.status, 'a media_apps_user should be allowed into the music app').toBeLessThan(300)
    const { JWT } = await loginRes.json() as { JWT: string }

    const resetRes = await fetch(`${MEDIA_API}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cardinal-app': 'music',
        Authorization: `Bearer ${JWT}`,
      },
      body: JSON.stringify({ type: 'factory', validationString: VALIDATION_PHRASE }),
    })
    expect(resetRes.status).toBe(403)

    // Refused, not half-run.
    expect(await isFirstTimeSetupDone()).toBe(true)
  },
)
