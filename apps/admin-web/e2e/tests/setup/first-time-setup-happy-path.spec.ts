import { v4 as uuid } from 'uuid'

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
  mockHomeServerInstance,
  // Media-server lifecycle
  factoryResetMediaServer,
  getMediaServerOption,
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

  Per design, all DB writes are deferred until Finish — the SSO popup
  during step 4 yields a JWT but does not persist anything that the test
  needs to wait for. Assertions for the claim, server name, and telemetry
  all happen after `submitSetup`.

  Per-test isolation:
    - factoryResetMediaServer() wipes the media server back to not_setup.
    - mockHomeServerInstance() pins /api/v1/instance to a fixture
      instanceId so the auth-server claim row doesn't collide with other
      tests or the real live instance.
    - A fresh Cardinal user is registered per test and cleaned up in
      finally; the claim row is deleted by instanceId.
*/

test(
  'completing the wizard with default choices writes the claim, persists options, and redirects to /admin/login',
  { tag: ['@journey:first-time-setup', '@journey:first-time-setup-claim-side-effect'] },
  async ({ page, testEmail, testPassword }) => {
    const instanceId = uuid()
    const serverName = `e2e-${instanceId.slice(0, 8)}`

    await factoryResetMediaServer()
    await mockHomeServerInstance(page, { instanceId, serverName })

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

      // Side effect 1: claim row exists on the auth server.
      const claim = await getSelfHostedClaim(instanceId)
      expect(claim, 'POST /setup should have written a claim row for this instance').not.toBeNull()
      expect(claim?.instanceId).toBe(instanceId)
      expect(claim?.userId).toBe(userId)

      // Side effect 2: media-server options reflect the wizard input.
      const serverNameOpt = await getMediaServerOption('server_name')
      expect(serverNameOpt).toBe(serverName)
      const setupDone = await getMediaServerOption('first_time_setup_done')
      expect(String(setupDone)).toBe('true')
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(jwt)
    }
  },
)
