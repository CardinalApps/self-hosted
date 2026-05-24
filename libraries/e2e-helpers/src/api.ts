import type { Page } from '@playwright/test'

import { JWT_STORAGE_KEY } from './sso'

// Use explicit IPv4 — Node 18+ resolves 'localhost' to ::1 (IPv6) which the auth server doesn't bind
const AUTH_BASE = 'http://127.0.0.1:4013'

// Force every request through the helpers to look like a real Chromium browser
// so that the auth server's per-session UA fingerprint check accepts requests
// made from both Playwright (the browser context) and Node (these helpers).
// Keep this in sync with the UA Playwright Chromium uses by default — if the
// browser UA drifts in a future Playwright bump, helpers must follow.
const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Decode the userId out of a Cardinal cloud JWT without verifying the signature.
// Tests don't need to verify — they just need to call userId-scoped endpoints.
export function getUserIdFromJwt(jwt: string): string {
  const parts = jwt.split('.')
  if (parts.length !== 3) throw new Error('Malformed JWT')
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
  if (typeof payload?.userId !== 'string') throw new Error('JWT does not carry a userId')
  return payload.userId
}

// Create a fresh test user and return their cloud JWT. POST /user is rate-limited
// to 3/60s per IP, so when the suite runs hot we transparently honor the server's
// RateLimit-Reset header and retry. Set DISABLE_RATE_LIMIT=true in the auth
// server's env to skip the wait entirely.
export async function registerUser(email: string, password: string): Promise<string> {
  const maxRetries = 4
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${AUTH_BASE}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': BROWSER_UA,
      },
      body: JSON.stringify({ email, password }),
    })

    if (res.status === 429 && attempt < maxRetries) {
      const resetSeconds = Number(res.headers.get('ratelimit-reset')) || 5
      await new Promise((r) => setTimeout(r, (resetSeconds + 1) * 1000))
      continue
    }

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`registerUser failed (${res.status}): ${text}`)
    }
    const data = await res.json() as { JWT?: string }
    if (!data.JWT) throw new Error('Registration did not return a JWT')
    return data.JWT
  }
  throw new Error('registerUser exhausted rate-limit retries')
}

// Tear down a test user. Never throws — used in finally blocks.
export async function deleteTestUser(jwt: string): Promise<void> {
  await fetch(`${AUTH_BASE}/user`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${jwt}` },
  })
}

// Enable email MFA on the given user. After this call, any subsequent SSO
// flow into a non-trusted-app or a check-in that resolves the user will
// include the EMAIL_MFA challenge.
export async function enableEmailMfa(jwt: string): Promise<void> {
  const res = await fetch(`${AUTH_BASE}/user`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BROWSER_UA,
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      userDefinedSettings: { mfa_email: true },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`enableEmailMfa failed (${res.status}): ${text}`)
  }
}

// Read the latest unused MFA code for a user via the dev-only helper endpoint.
// Returns undefined if no code is queued (caller should poll).
export async function getLatestMfaCode(userId: string): Promise<string | undefined> {
  const res = await fetch(`${AUTH_BASE}/dev/sso/last-mfa-code/${encodeURIComponent(userId)}`, {
    headers: { 'User-Agent': BROWSER_UA },
  })
  if (res.status === 404) return undefined
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`getLatestMfaCode failed (${res.status}): ${text}`)
  }
  const data = await res.json() as { mfaCode?: string }
  return data.mfaCode
}

// Poll the dev MFA endpoint until a code arrives, or throw on timeout.
export async function waitForMfaCode(userId: string, timeoutMs = 5_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const code = await getLatestMfaCode(userId)
    if (code) return code
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`waitForMfaCode timed out after ${timeoutMs}ms for user ${userId}`)
}

// Force-expire an interactive login session via the dev-only delete endpoint.
// Used to test the "Invalid or expired login session" path without waiting on
// the 10-minute MongoDB TTL reaper.
export async function expireInteractiveLoginSession(sessionId: string): Promise<void> {
  const res = await fetch(`${AUTH_BASE}/dev/sso/interactive-login-session/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: { 'User-Agent': BROWSER_UA },
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`expireInteractiveLoginSession failed (${res.status}): ${text}`)
  }
}

// Create an interactive login session by talking to the auth server directly,
// the way the parent app's SSOLogin button would. Used by tests that need to
// drive direct popup URLs (e.g. the no-parent-window security check) without
// going through the React parent button.
export async function createInteractiveLoginSession(
  appId: string,
  nonce: string,
  origin: string,
  serverName = 'Cardinal Account Portal (e2e)',
): Promise<{ interactiveLoginUrl: string, interactiveLoginSessionId: string }> {
  const res = await fetch(`${AUTH_BASE}/sso/interactive-login-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BROWSER_UA,
      Origin: origin,
    },
    body: JSON.stringify({ appId, nonce, serverName }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`createInteractiveLoginSession failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<{ interactiveLoginUrl: string, interactiveLoginSessionId: string }>
}

// Create a self-hosted-app claim mapping instanceId -> userId via the dev-only
// endpoint. Used by AUTHORIZE_UNTRUSTED_APP tests where a test fixture needs
// the instance to already be claimed by some other user.
export async function createSelfHostedClaim(instanceId: string, userId: string): Promise<void> {
  const res = await fetch(`${AUTH_BASE}/dev/sso/claim/${encodeURIComponent(instanceId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BROWSER_UA,
    },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`createSelfHostedClaim failed (${res.status}): ${text}`)
  }
}

// Delete a self-hosted-app claim. Never throws — used in finally blocks.
export async function deleteSelfHostedClaim(instanceId: string): Promise<void> {
  await fetch(`${AUTH_BASE}/dev/sso/claim/${encodeURIComponent(instanceId)}`, {
    method: 'DELETE',
    headers: { 'User-Agent': BROWSER_UA },
  })
}

// Register a fresh user and seed the page's localStorage with their cloud JWT,
// so the next navigation under the app's origin starts already logged in.
// Skips the SSO popup. Caller must `deleteTestUser(jwt)` in a finally block.
export async function seedLoggedInUser(
  page: Page,
  email: string,
  password: string,
  options: { confirmed?: boolean, mfa?: boolean } = {},
): Promise<{ jwt: string, userId: string, email: string }> {
  const jwt = await registerUser(email, password)
  const userId = getUserIdFromJwt(jwt)

  if (options.confirmed) await confirmUserEmail(userId)
  if (options.mfa) await enableEmailMfa(jwt)

  // Land on the app origin and wait for bootstrap to settle before writing the
  // token. Writing into localStorage while the cloud SDK is still initializing
  // races with its own JWT init, which silently clobbers the value we wrote.
  await page.goto('/')
  await page.waitForSelector('.app-loading', { state: 'hidden', timeout: 10_000 })
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [JWT_STORAGE_KEY, jwt] as const,
  )

  return { jwt, userId, email }
}

// Authenticate against the dev short-circuit of the SSO check-out flow and
// seed the page's localStorage with the returned JWT — fast path to a
// logged-in browser for an existing user without driving the SSO popup.
// Counterpart to `seedLoggedInUser`, which is for users you also need to
// create. The exchangeToken is returned but not consumed; callers who want
// the refresh-cookie set on the app origin should POST it to /auth/exchange
// themselves.
export async function loginViaApi(
  page: Page,
  email: string,
  password: string,
): Promise<{ jwt: string, exchangeToken: string }> {
  const res = await fetch(`${AUTH_BASE}/dev/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BROWSER_UA,
    },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`loginViaApi failed (${res.status}): ${text}`)
  }
  const data = await res.json() as { JWT?: string, exchangeToken?: string }
  if (!data.JWT) throw new Error('loginViaApi: response did not include a JWT')
  if (!data.exchangeToken) throw new Error('loginViaApi: response did not include an exchangeToken')

  await page.goto('/')
  await page.waitForSelector('.app-loading', { state: 'hidden', timeout: 10_000 })
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [JWT_STORAGE_KEY, data.JWT] as const,
  )

  return { jwt: data.JWT, exchangeToken: data.exchangeToken }
}

// Read the latest unused password-reset token for the user with the given
// email. Returns undefined if none is queued (caller should poll).
export async function getLatestPasswordResetToken(email: string): Promise<string | undefined> {
  const res = await fetch(`${AUTH_BASE}/dev/user/password-reset-token?email=${encodeURIComponent(email)}`, {
    headers: { 'User-Agent': BROWSER_UA },
  })
  if (res.status === 404) return undefined
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`getLatestPasswordResetToken failed (${res.status}): ${text}`)
  }
  const data = await res.json() as { token?: string }
  return data.token
}

// Poll the password-reset-token endpoint until a token arrives, or throw on timeout.
export async function waitForPasswordResetToken(email: string, timeoutMs = 5_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const token = await getLatestPasswordResetToken(email)
    if (token) return token
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`waitForPasswordResetToken timed out after ${timeoutMs}ms for ${email}`)
}

// Read the latest unused email-change token for a user. Returns undefined when
// none is queued.
export async function getLatestEmailChangeToken(userId: string): Promise<{ token: string, newEmail: string } | undefined> {
  const res = await fetch(`${AUTH_BASE}/dev/user/${encodeURIComponent(userId)}/email-change-token`, {
    headers: { 'User-Agent': BROWSER_UA },
  })
  if (res.status === 404) return undefined
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`getLatestEmailChangeToken failed (${res.status}): ${text}`)
  }
  const data = await res.json() as { token?: string, newEmail?: string }
  if (!data.token || !data.newEmail) return undefined
  return { token: data.token, newEmail: data.newEmail }
}

// Poll the email-change-token endpoint until one arrives, or throw on timeout.
export async function waitForEmailChangeToken(userId: string, timeoutMs = 5_000): Promise<{ token: string, newEmail: string }> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await getLatestEmailChangeToken(userId)
    if (result) return result
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`waitForEmailChangeToken timed out after ${timeoutMs}ms for user ${userId}`)
}

// Read the 6-digit code from the latest unused delete-account token for a user.
// Returns undefined when none is queued.
export async function getLatestDeletionCode(userId: string): Promise<string | undefined> {
  const res = await fetch(`${AUTH_BASE}/dev/user/${encodeURIComponent(userId)}/deletion-code`, {
    headers: { 'User-Agent': BROWSER_UA },
  })
  if (res.status === 404) return undefined
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`getLatestDeletionCode failed (${res.status}): ${text}`)
  }
  const data = await res.json() as { code?: string }
  return data.code
}

// Poll the deletion-code endpoint until one arrives, or throw on timeout.
export async function waitForDeletionCode(userId: string, timeoutMs = 5_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const code = await getLatestDeletionCode(userId)
    if (code) return code
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`waitForDeletionCode timed out after ${timeoutMs}ms for user ${userId}`)
}

// Mint an additional session row for the user so the sessions list and its
// revoke flow have something to act on beyond the current session.
export async function createExtraSession(
  userId: string,
  options: { appId?: string, userAgent?: string } = {},
): Promise<string> {
  const res = await fetch(`${AUTH_BASE}/dev/user/${encodeURIComponent(userId)}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BROWSER_UA,
    },
    body: JSON.stringify(options),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`createExtraSession failed (${res.status}): ${text}`)
  }
  const data = await res.json() as { sessionId?: string }
  if (!data.sessionId) throw new Error('createExtraSession returned no sessionId')
  return data.sessionId
}

// Insert an app-authorization row so the /account/app-authorizations view has
// content to render against. Defaults `origin` and `instanceId` server-side.
export async function createTestAppAuthorization(
  userId: string,
  appId: string,
  options: { instanceId?: string, origin?: string } = {},
): Promise<string> {
  const res = await fetch(`${AUTH_BASE}/dev/user/${encodeURIComponent(userId)}/app-authorizations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BROWSER_UA,
    },
    body: JSON.stringify({ appId, ...options }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`createTestAppAuthorization failed (${res.status}): ${text}`)
  }
  const data = await res.json() as { id?: string }
  if (!data.id) throw new Error('createTestAppAuthorization returned no id')
  return data.id
}

// Mark a user's email as confirmed via the dev-only endpoint. Most apps with
// `emailMustBeVerfied: true` (cardinal-admin, photos, music, cinema) require
// this before SSO can complete, so any happy-path test against them needs to
// promote the freshly-registered user out of the default unconfirmed state.
export async function confirmUserEmail(userId: string): Promise<void> {
  const res = await fetch(`${AUTH_BASE}/dev/user/${encodeURIComponent(userId)}/confirm-email`, {
    method: 'POST',
    headers: { 'User-Agent': BROWSER_UA },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`confirmUserEmail failed (${res.status}): ${text}`)
  }
}
