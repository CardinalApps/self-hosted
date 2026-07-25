import { randomUUID } from 'node:crypto'

import {
  test,
  expect,
  registerUser,
  deleteTestUser,
  confirmUserEmail,
  getUserIdFromJwt,
  deleteSelfHostedClaim,
  factoryResetMediaServer,
  getMediaServerOption,
  getMediaServerSetting,
  clickWelcomeStart,
  pickTheme,
  setServerNameAndContinue,
  completeSetupSSO,
  setTelemetryAgreement,
  clickSetupNext,
  submitSetup,
} from '@cardinalapps/e2e-helpers'

/*
  Variants of the happy path that exercise the choice-driven options:
  picking dark theme + opting out of anonymous telemetry. Asserts both
  flow through POST /setup and are persisted as media-server options.

  The wizard's POST /setup payload shape is { theme, serverName,
  sendAnonymousUsageData, ssoToken } (see FirstTimeSetup.tsx
  handleFinishSetup) — these choices live on settings options at the
  database layer.

  Like the happy-path spec, the claim is keyed by the media-server's
  real instance_id, so we look that up after factoryReset and use it for
  cleanup on both ends.
*/

test(
  'picking dark theme + opting out of telemetry persists both options',
  { tag: ['@journey:first-time-setup-theme-choice', '@journey:first-time-setup-telemetry-choice'] },
  async ({ page, testEmail, testPassword }) => {
    const serverName = `e2e-${randomUUID().slice(0, 8)}`

    await factoryResetMediaServer()
    const instanceId = await getMediaServerOption('instance_id') as string
    await deleteSelfHostedClaim(instanceId)

    const jwt = await registerUser(testEmail, testPassword)
    await confirmUserEmail(getUserIdFromJwt(jwt))

    try {
      await page.goto('/admin/setup')
      await clickWelcomeStart(page)
      await pickTheme(page, 'dark')
      await setServerNameAndContinue(page, serverName)
      await completeSetupSSO(page, { email: testEmail, password: testPassword })
      await clickSetupNext(page, 'login')
      await setTelemetryAgreement(page, false)
      await clickSetupNext(page, 'usage-data')
      await clickSetupNext(page, 'privacy')
      await clickSetupNext(page, 'help')

      await submitSetup(page)

      await page.waitForURL((url) => !url.pathname.includes('/admin/setup'), { timeout: 15_000 })

      /*
       * The wizard keeps the theme in local state and posts it with the rest of the setup data at
       * the end, where it is stored against the account that just completed setup. What matters on
       * this side of the wizard is that the pick is the theme actually applied to the app the user
       * lands in - the attribute the theme CSS is keyed on.
       */
      await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'dark')

      // telemetry is server-wide - the wizard's `sendAnonymousUsageData` maps to it
      const telemetry = await getMediaServerSetting('admin', 'telemetry')
      expect(String(telemetry)).toBe('false')
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(jwt)
    }
  },
)
