import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

import { LOGIN_BUTTON_SELECTOR } from './sso'

/*
  Intent-based helpers for driving the admin-web First Time Setup wizard.

  Every step has a `data-testid="setup-step"` container with a
  `data-step-name="<id>"` attribute, and any next/prev/submit controls live
  inside that container with their own testids. Tests scope every action by
  step name, so reordering the wizard or adding/removing steps doesn't
  break call sites that target a specific step by name.
*/

const STEP = (name: string) => `[data-testid="setup-step"][data-step-name="${name}"]`

// Wait until the named step is visible. Useful as a sequence point between
// helpers (e.g. after `clickNextOn('theme')`, the test usually wants to
// `waitForStep('server-name')` before the next action).
export async function waitForSetupStep(page: Page, stepName: string, timeoutMs = 10_000): Promise<void> {
  await expect(page.locator(STEP(stepName))).toBeVisible({ timeout: timeoutMs })
}

// Generic step navigation — when an intent-based helper doesn't fit (or
// when a new step is added that just needs "click next").
export async function clickSetupNext(page: Page, stepName: string): Promise<void> {
  await page.locator(`${STEP(stepName)} [data-testid="setup-step-next"]`).click()
}

export async function clickSetupPrev(page: Page, stepName: string): Promise<void> {
  await page.locator(`${STEP(stepName)} [data-testid="setup-step-prev"]`).click()
}

// --- Welcome (step 1) ---------------------------------------------------

// The Welcome screen's start button fades in across ~5s of animation —
// give it generous timeout when actioning. After click, the wizard
// advances to the next step (currently Theme).
export async function clickWelcomeStart(page: Page): Promise<void> {
  await waitForSetupStep(page, 'welcome')
  const btn = page.locator(`${STEP('welcome')} [data-testid="setup-step-next"]`)
  await expect(btn).toBeVisible({ timeout: 15_000 })
  await btn.click()
}

// --- Theme --------------------------------------------------------------

// Theme swatches both pick the theme AND advance — single click does both.
// `value` matches the canonical setting value (`light` / `dark`).
export async function pickTheme(page: Page, value: 'light' | 'dark'): Promise<void> {
  await waitForSetupStep(page, 'theme')
  await page.locator(`${STEP('theme')} [data-testid="setup-theme-swatch"][data-theme-value="${value}"]`).click()
}

// --- Server name --------------------------------------------------------

// Fills the server name without advancing. Use `setServerNameAndContinue`
// for the more common case where the test wants to move on.
export async function fillServerName(page: Page, name: string): Promise<void> {
  await waitForSetupStep(page, 'server-name')
  await page.locator(`${STEP('server-name')} [data-testid="setup-server-name-input"]`).fill(name)
}

export async function setServerNameAndContinue(page: Page, name: string): Promise<void> {
  await fillServerName(page, name)
  await clickSetupNext(page, 'server-name')
}

// --- Login (SSO) --------------------------------------------------------

// Drives the SSO popup that step 4 opens via CardinalAdminSSOButton. The
// popup may also surface the CLAIM_SELF_HOSTED_APP challenge if the auth
// server treats this instance as unclaimed at popup time — handle it if
// it appears, otherwise carry on.
//
// Caller responsibility: register the Cardinal user with confirmed email
// before invoking. Cleanup of the claim row (if any) belongs in the
// spec's finally block via `deleteSelfHostedClaim(instanceId)`.
export async function completeSetupSSO(
  page: Page,
  opts: { email: string, password: string },
): Promise<void> {
  await waitForSetupStep(page, 'login')

  const popupPromise = page.waitForEvent('popup')
  await page.locator(`${STEP('login')} ${LOGIN_BUTTON_SELECTOR}`).click()
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')

  await popup.waitForSelector('#login-email', { timeout: 10_000 })
  await popup.fill('#login-email', opts.email)
  await popup.fill('#login-pw', opts.password)
  await popup.getByRole('button', { name: 'Sign in', exact: true }).click()

  // The popup either closes immediately (login complete, no further
  // challenges) or surfaces the CLAIM_SELF_HOSTED_APP review card with a
  // 9-second cooldown. Race the two outcomes.
  const claimHeading = popup.getByRole('heading', { name: /Claim This Self-Hosted App/i })
  const closeEvent = popup.waitForEvent('close', { timeout: 15_000 }).then(() => 'closed' as const)
  const claimVisible = claimHeading.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'claim' as const)
  const result = await Promise.race([closeEvent, claimVisible])

  if (result === 'claim') {
    const claimButton = popup.getByRole('button', { name: /Claim/ })
    await expect(claimButton, 'Claim button should enable after the cooldown').toBeEnabled({ timeout: 15_000 })
    await claimButton.click()
    await popup.waitForEvent('close', { timeout: 10_000 })
  }

  // The parent's Login step renders a "logged in as <name>" line — the
  // `setup-login-confirmed` testid + `data-logged-in="true"` on the
  // step container both flip once `onSSOSuccess` lands and stores the
  // future-owner state.
  await expect(page.locator(`${STEP('login')}[data-logged-in="true"]`)).toBeVisible({ timeout: 10_000 })
}

// --- Usage data ---------------------------------------------------------

// Toggles the anonymous-usage-data switch (the wizard ships it on by
// default). Pass `true` to leave it on, `false` to opt out.
export async function setTelemetryAgreement(page: Page, agree: boolean): Promise<void> {
  await waitForSetupStep(page, 'usage-data')
  // The ToggleSwitch's underlying <input> carries the form `name`; the
  // wrapping <label> has class `toggle-switch` and gains `enabled` when
  // the value matches value2 (true). Reading the input's `checked`
  // property tells us the current state.
  const input = page.locator(`${STEP('usage-data')} input[name="agree-to-anonymous-usage-data"]`)
  const checked = await input.isChecked()
  if (checked !== agree) {
    // Click the wrapping label rather than the input itself; the input is
    // visually hidden in some themes.
    await page.locator(`${STEP('usage-data')} label.toggle-switch`).click()
  }
}

// --- Finish -------------------------------------------------------------

// Click the Finish button and wait for the wizard to exit. POST /setup
// flips `first_time_setup_done` and the wizard's effect navigates to
// /admin/login.
export async function submitSetup(page: Page): Promise<void> {
  await waitForSetupStep(page, 'finish')
  await page.locator(`${STEP('finish')} [data-testid="setup-step-submit"]`).click()
}
