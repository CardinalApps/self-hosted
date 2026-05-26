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
    1. Submitting empty doesn't advance — the `next` handler short-circuits
       when serverName is falsy (FirstTimeSetup.tsx and ServerName.tsx
       both guard with `if (serverName) next()`).
    2. Invalid characters never make it into state — handleServerNameOnChange
       only updates state when every character matches /[A-Za-z-_1234567890]/.

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
  'characters outside [A-Za-z-_0-9] are filtered out of the server-name input',
  { tag: '@journey:first-time-setup-server-name-validation' },
  async ({ page }) => {
    await page.goto('/admin/setup')
    await clickWelcomeStart(page)
    await pickTheme(page, 'light')
    await waitForSetupStep(page, 'server-name')

    // ServerName.tsx's onChange filter rejects any value that contains a
    // char outside the allowed set, leaving state at the prior value.
    // Type a mixed string and assert the input reflects only the
    // accepted characters that survived round-by-round filtering.
    const input = page.locator('[data-testid="setup-step"][data-step-name="server-name"] [data-testid="setup-server-name-input"]')

    // Fill with valid first to give the input a baseline value the
    // invalid attempt can be compared against.
    await fillServerName(page, 'okname')
    await expect(input).toHaveValue('okname')

    // Type an invalid character — the filter rejects the new value (the
    // invalid char breaks the regex test for the WHOLE string), so the
    // input stays at 'okname'.
    await input.focus()
    await page.keyboard.type('!')
    await expect(input).toHaveValue('okname')
  },
)
