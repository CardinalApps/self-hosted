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
  factoryResetMediaServer,
  getMediaServerOption,
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
*/

test(
  'picking dark theme + opting out of telemetry persists both options',
  { tag: ['@journey:first-time-setup-theme-choice', '@journey:first-time-setup-telemetry-choice'] },
  async ({ page, testEmail, testPassword }) => {
    const instanceId = uuid()
    const serverName = `e2e-${instanceId.slice(0, 8)}`

    await factoryResetMediaServer()
    await mockHomeServerInstance(page, { instanceId, serverName })

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

      const theme = await getMediaServerOption('theme')
      expect(theme).toBe('dark')
      const telemetry = await getMediaServerOption('send_anonymous_usage_data')
      // Stored as a string at the DB layer; coerce for the comparison.
      expect(String(telemetry)).toBe('false')
    } finally {
      await deleteSelfHostedClaim(instanceId)
      await deleteTestUser(jwt)
    }
  },
)
