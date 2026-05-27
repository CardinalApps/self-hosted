import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  // Cloud / auth helpers
  registerUser,
  deleteTestUser,
  confirmUserEmail,
  getUserIdFromJwt,
  getSelfHostedClaim,
  deleteSelfHostedClaim,
  // Media-server lifecycle
  factoryResetMediaServer,
  getMediaServerOption,
  getMediaServerSetting,
  getLastClaimAttempt,
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
  Full first-time-setup happy path. Defaults: light theme, telemetry on,
  SSO completes successfully. Asserts the post-Finish side effects on both
  the auth server (claim row) and the media server (options + redirect).

  About the claim assertion:
    - The claim row is created by the media server's ClaimService listening
      for the CREATE_OWNER event during POST /setup (see
      servers/media/src/modules/claim/claim.service.ts). That handler
      reads INSTANCE_ID from the media server's own options and POSTs
      /user/claims to the auth server with it.
    - So the claim row is keyed by the *real* media-server instanceId,
      not by anything the browser sends. We look it up here via
      `getMediaServerOption('instance_id')` after factoryReset and use
      that for both pre-test cleanup (any stale claim from a prior run)
      and the post-Finish assertion.
*/

test(
  'completing the wizard with default choices writes the claim, persists options, and redirects to /admin/login',
  { tag: ['@journey:first-time-setup', '@journey:first-time-setup-claim-side-effect'] },
  async ({ page, testEmail, testPassword }) => {
    const serverName = `e2e-${randomUUID().slice(0, 8)}`

    await factoryResetMediaServer()
    const instanceId = await getMediaServerOption('instance_id') as string
    // factoryReset preserves INSTANCE_ID across runs, so a leftover claim
    // from a previous FTS run can still be in mongo. Clear it before
    // walking the wizard — the auth server's POST /user/claims would
    // otherwise hit a duplicate-instanceId conflict.
    await deleteSelfHostedClaim(instanceId)

    const jwt = await registerUser(testEmail, testPassword)
    const userId = getUserIdFromJwt(jwt)
    await confirmUserEmail(userId)

    try {
      await page.goto('/admin/setup')

      await clickWelcomeStart(page)
      await pickTheme(page, 'light')
      await setServerNameAndContinue(page, serverName)
      await completeSetupSSO(page, { email: testEmail, password: testPassword })
      await clickSetupNext(page, 'login')
      // Telemetry defaults to true; leave it alone for the happy path.
      await setTelemetryAgreement(page, true)
      await clickSetupNext(page, 'usage-data')
      await clickSetupNext(page, 'privacy')
      await clickSetupNext(page, 'help')
      await submitSetup(page)

      // After Finish: the wizard's effect navigates away from /admin/setup
      // once homeServerUserLoggedIn && firstTimeSetupComplete both flip.
      await page.waitForURL((url) => !url.pathname.includes('/admin/setup'), { timeout: 15_000 })

      // Side effect 1: claim row exists on the auth server. The ClaimService
      // fires the POST asynchronously after CREATE_OWNER, so poll briefly
      // rather than asserting on the first read.
      let claim = await getSelfHostedClaim(instanceId)
      const claimDeadline = Date.now() + 5_000
      while (!claim && Date.now() < claimDeadline) {
        await new Promise((r) => setTimeout(r, 200))
        claim = await getSelfHostedClaim(instanceId)
      }
      if (!claim) {
        // Pull the media server's in-memory record of its most recent claim
        // attempt — without this the test would just say "got null" without
        // explaining why (the .catch in ClaimService swallows the rejection
        // after logging it).
        const lastAttempt = await getLastClaimAttempt()
        expect(
          claim,
          `POST /setup should have written a claim row for instance ${instanceId}. Last claim attempt from the media server: ${JSON.stringify(lastAttempt, null, 2)}`,
        ).not.toBeNull()
      }
      expect(claim?.instanceId).toBe(instanceId)
      expect(claim?.userId).toBe(userId)

      // Side effect 2: media-server state reflects the wizard input.
      // server_name is a setting (per-app), first_time_setup_done is an option.
      const serverNameSetting = await getMediaServerSetting('admin', 'server_name')
      expect(serverNameSetting).toBe(serverName)
      const setupDone = await getMediaServerOption('first_time_setup_done')
      expect(String(setupDone)).toBe('true')
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(jwt)
    }
  },
)
