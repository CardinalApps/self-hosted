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
