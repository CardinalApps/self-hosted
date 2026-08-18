import {
  test,
  expect,
  factoryResetMediaServer,
  clickWelcomeStart,
  pickTheme,
  waitForSetupStep,
  clickSetupNext,
  fillServerName,
} from '@cardinalapps/e2e-helpers'

/*
  Server-name step validation. Two paths:
    1. Submitting a blank name doesn't advance — the `next` handler
       short-circuits when serverName has no non-whitespace content.
    2. Invalid characters never make it into state — handleServerNameOnChange
       only updates state when the whole value matches SERVER_NAME_PATTERN.
       Spaces are inside that set: they are legal in a display name.

  Neither test needs SSO / cleanup; we never reach Finish, so nothing is
  persisted on either server.
*/

test.beforeEach(async () => {
  await factoryResetMediaServer()
})

test(
  'clicking next with an empty server name keeps the user on the server-name step',
  { tag: '@journey:first-time-setup-server-name-validation' },
  async ({ page }) => {
    await page.goto('/admin/setup')
    await clickWelcomeStart(page)
    await pickTheme(page, 'light')
    await waitForSetupStep(page, 'server-name')

    // No fill — input stays empty. Click next; the guard prevents the
    // wizard from advancing.
    await clickSetupNext(page, 'server-name')

    // Still on server-name; login step (next in current order) has not
    // mounted.
    await expect(page.locator('[data-testid="setup-step"][data-step-name="server-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="setup-step"][data-step-name="login"]')).toHaveCount(0)
  },
)

test(
  'the server-name input keeps spaces and rejects characters outside the allowed set',
  { tag: '@journey:first-time-setup-server-name-validation' },
  async ({ page }) => {
    await page.goto('/admin/setup')
    await clickWelcomeStart(page)
    await pickTheme(page, 'light')
    await waitForSetupStep(page, 'server-name')

    const input = page.locator('[data-testid="setup-step"][data-step-name="server-name"] [data-testid="setup-server-name-input"]')

    // A multi-word name survives intact; the spaces are not stripped back out.
    await fillServerName(page, 'ok name here')
    await expect(input).toHaveValue('ok name here')

    // An invalid character still breaks the regex test for the WHOLE value, so
    // the filter rejects the new value and the input keeps the prior one.
    await input.focus()
    await page.keyboard.type('!')
    await expect(input).toHaveValue('ok name here')
  },
)
