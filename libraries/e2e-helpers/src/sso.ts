import { expect, type Page } from '@playwright/test'

// localStorage key the cloud SDK uses for the cloud user JWT.
export const JWT_STORAGE_KEY = '@cardinal/cloud_user_tolkien'

// The "Sign in with Cardinal Cloud" anchor rendered by <SSOLogin>.
export const LOGIN_BUTTON_SELECTOR = '.login-with-cardinal-button'

// Navigate to a path on the current baseURL, wait for the app shell to be ready,
// then return. Apps use <AppLoading> from libraries/ui which renders an
// `.app-loading` overlay until init completes.
export async function gotoHome(page: Page, path = '/'): Promise<void> {
  await page.goto(path)
  await page.waitForSelector('.app-loading', { state: 'hidden' })
}

// Click the "Sign in with Cardinal Cloud" button and return the popup once it
// opens. Does not wait for the IPC handshake to complete.
export async function openSSOPopup(page: Page): Promise<Page> {
  const popupPromise = page.waitForEvent('popup')
  await page.click(LOGIN_BUTTON_SELECTOR)
  const popup = await popupPromise
  // Don't `waitForLoadState('networkidle')` — the popup keeps a poll-like
  // interval running in its parent, so 'networkidle' never fires.
  await popup.waitForLoadState('domcontentloaded')
  return popup
}

// Click the SSO button, wait for the popup to clear the IPC handshake and
// render the email-and-password challenge, and return the popup.
export async function openSSOPopupAndAdvanceToLogin(page: Page): Promise<Page> {
  const popup = await openSSOPopup(page)
  await popup.waitForSelector('#login-email', { timeout: 5_000 })
  return popup
}

// Fill the email/password fields in the SSO popup and submit. Does not assert
// what happens next — callers decide whether the next step is success, MFA,
// or an error.
export async function submitSSOCredentials(popup: Page, email: string, password: string): Promise<void> {
  await popup.fill('#login-email', email)
  await popup.fill('#login-pw', password)
  await popup.getByRole('button', { name: 'Sign in', exact: true }).click()
}

// Assert that the parent page is logged in: JWT is in localStorage and the
// route has changed to an authenticated route. Pass the regex for the
// expected post-login URL — defaults to anything under `/account/`.
export async function expectParentLoggedIn(page: Page, postLoginUrl: RegExp = /\/account\//): Promise<void> {
  await page.waitForURL(postLoginUrl, { timeout: 10_000 })
  const jwt = await page.evaluate((key) => localStorage.getItem(key), JWT_STORAGE_KEY)
  expect(jwt, 'expected a cloud JWT in localStorage after SSO').toBeTruthy()
}

// Intercept the home server's GET /api/v1/instance call so a self-hosted app
// (admin-web, photos-web, music-web, cinema-web) sees a test-controlled
// instanceId instead of whatever the running Cardinal Media Server reports.
// Each test gets a fresh instanceId, which lets us drive CLAIM and AUTHORIZE
// challenges without contending for state on the live CMS instance.
export async function mockHomeServerInstance(
  page: Page,
  body: { instanceId: string, serverName: string, kioskMode?: boolean },
): Promise<void> {
  await page.route('**/api/v1/instance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ kioskMode: false, ...body }),
    })
  })
}
