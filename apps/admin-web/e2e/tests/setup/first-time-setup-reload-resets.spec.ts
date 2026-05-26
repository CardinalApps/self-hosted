import {
  test,
  expect,
  factoryResetMediaServer,
  clickWelcomeStart,
  pickTheme,
  setServerNameAndContinue,
  waitForSetupStep,
} from '@cardinalapps/e2e-helpers'

/*
  Wizard state is held entirely in component-local useState (see
  FirstTimeSetup.tsx). There's no persistence between page loads, so a
  reload from any step restarts the wizard at step 1 (Welcome).

  If "resume mid-wizard" ever becomes a product requirement, this spec is
  the canary — the assertion will flip and the spec gets rewritten to
  match the new behavior.
*/

test.beforeEach(async () => {
  await factoryResetMediaServer()
})

test(
  'reloading mid-wizard restarts at the Welcome step',
  { tag: '@journey:first-time-setup-reload-resets' },
  async ({ page }) => {
    await page.goto('/admin/setup')
    await clickWelcomeStart(page)
    await pickTheme(page, 'light')
    await setServerNameAndContinue(page, 'mid-wizard-name')

    // After three step advances, the wizard is at step 4 (login).
    await waitForSetupStep(page, 'login')

    await page.reload()

    // After reload, useState resets, so the wizard renders step 1.
    await waitForSetupStep(page, 'welcome')
    await expect(page.locator('[data-testid="setup-step"][data-step-name="login"]')).toHaveCount(0)
  },
)
