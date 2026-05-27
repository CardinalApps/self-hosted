import * as path from 'node:path'
import type { Page } from '@playwright/test'

/*
  Helpers for tests that need to seed or read state on the local media server.

  All endpoints sit under /api/v1/dev/* and require
  CARDINAL_ENABLE_DEV_ENDPOINTS=true on the running server. If the env var
  isn't set the routes return 404 (NestJS NotFoundException) — that's the
  signal a caller should restart the server with the dev flag.
*/

const MEDIA_BASE = 'http://localhost:3080/api/v1'

// Match the UA used by the auth helpers so any UA-pinning middleware sees
// the same browser fingerprint across both servers.
const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': BROWSER_UA,
}

async function devCall<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${MEDIA_BASE}${path}`, {
    method,
    headers: DEFAULT_HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<T>
}

// Reset the media server back to fresh, no-owner state. Wraps the existing
// factoryReset() service method, skipping the validation-phrase gate that
// the production /reset endpoint requires. Use in `beforeAll` or
// `beforeEach` for tests that need a clean slate.
export async function factoryResetMediaServer(): Promise<void> {
  await devCall('POST', '/dev/factory-reset')
}

// Skip the first-time-setup wizard. Tests that aren't about the wizard call
// this once and proceed with an already-configured server.
export async function completeFirstTimeSetup(options: {
  serverName?: string,
  theme?: string,
  sendAnonymousUsageData?: boolean,
  userCardinalJWT?: string,
} = {}): Promise<{ ok: boolean, accountToLogInto?: string }> {
  return devCall('POST', '/dev/first-time-setup', options)
}

// True iff the media server has completed first-time-setup. Reads the
// `first_time_setup_done` option directly; returns false when the option is
// absent (the not_setup state) without throwing.
export async function isFirstTimeSetupDone(): Promise<boolean> {
  const res = await fetch(`${MEDIA_BASE}/dev/options/first_time_setup_done`, {
    headers: DEFAULT_HEADERS,
  })
  if (res.status === 404) return false
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GET /dev/options/first_time_setup_done failed (${res.status}): ${text}`)
  }
  const data = await res.json() as { value: unknown }
  return data.value === true || data.value === 'true' || data.value === 1
}

// Idempotent counterpart to `completeFirstTimeSetup` — runs FTS only if the
// server isn't already set up. Lets the regular (non-FTS) e2e suite assume a
// configured server without wiping the developer's local state on every test.
export async function ensureFirstTimeSetup(options: {
  serverName?: string,
  theme?: string,
  sendAnonymousUsageData?: boolean,
  userCardinalJWT?: string,
} = {}): Promise<void> {
  if (await isFirstTimeSetupDone()) return
  await completeFirstTimeSetup(options)
}

// Delete a user by its userId UUID. Used by tests that seed users via
// `seedLocalUser` and need to clean up in `afterEach` without resetting the
// whole server.
export async function deleteLocalUser(userId: string): Promise<void> {
  await devCall('DELETE', `/dev/users/${encodeURIComponent(userId)}`)
}

// Create a local user with the given role. Returns the userId.
export async function seedLocalUser(args: {
  username: string,
  password: string,
  role: string,
}): Promise<{ userId: string }> {
  return devCall('POST', '/dev/users/local', args)
}

// Grant a role to any user (cloud or local).
export async function grantRole(userId: string, role: string): Promise<void> {
  await devCall('POST', '/dev/users/grant-role', { userId, role })
}

// Revoke a role from any user.
export async function revokeRole(userId: string, role: string): Promise<void> {
  await devCall('POST', '/dev/users/revoke-role', { userId, role })
}

// Insert a library row directly. `paths` should be absolute disk paths —
// see `fixturePath()` for resolving fixture-relative paths.
export async function seedLibrary(args: {
  name?: string,
  paths: string[],
  ownerUserId?: string,
}): Promise<{ id: number, libraryId: string }> {
  return devCall('POST', '/dev/libraries', args)
}

// Remove a library by its libraryId UUID.
export async function deleteLibrary(libraryId: string): Promise<void> {
  await devCall('DELETE', `/dev/libraries/${encodeURIComponent(libraryId)}`)
}

// Read a server option by name. Returns the raw stored value (always a
// string at the database layer — callers cast as needed).
export async function getMediaServerOption(name: string): Promise<unknown> {
  const result = await devCall<{ value: unknown }>('GET', `/dev/options/${encodeURIComponent(name)}`)
  return result.value
}

// Drive the guest-login button on /admin/login. Use as the default
// "I just need an admin-logged-in browser" path for admin-feature specs —
// it's the fastest route to a logged-in admin (no Cardinal Cloud popup,
// no local-user seeding).
//
// Caveat: guest auth is memory-scoped — the JWT never reaches localStorage,
// so any subsequent page.goto() loses the login. To land on a specific
// admin route, pass it as `targetUrl`: this helper navigates there first
// (which redirects to /admin/login on an unauthed session), clicks guest,
// and waits for the URL to leave /admin/login. Subsequent SPA-internal
// navigation (Link clicks) preserves the session; full page reloads do not.
//
// Requires the server to have completed first-time-setup; the guest button
// only renders once the guest account exists. Pair with
// completeFirstTimeSetup() in beforeEach.
export async function loginAsGuest(page: Page, targetUrl = '/admin'): Promise<void> {
  await page.goto(targetUrl)
  // Wait for the SPA bootstrap to settle before clicking. On a fresh page,
  // AppBase fires a silent token-refresh that 401s; handle401 then calls
  // fullLogout which dispatches RESET, clearing the user list (including
  // the guest account). If we click the Guest button before that cycle
  // completes, getGuestAccount() returns null mid-click and the login is
  // silently dropped with an ERR_CHS_0017 toast. Waiting for `.app-loading`
  // to hide guarantees the refresh + RESET have already happened, so the
  // user list is repopulated by the time we click.
  await page.waitForSelector('.app-loading', { state: 'hidden', timeout: 10_000 })
  await page.click('[data-testid="login-with-guest-button"]')
  await page.waitForURL((url) => url.pathname.startsWith('/admin') && url.pathname !== '/admin/login', { timeout: 10_000 })
}

// Resolve a path relative to `servers/media/tests/fixtures/` to an absolute
// path the media-server's indexer can read. Lets tests write fixture paths
// declaratively without coupling to the suite's working directory.
//
// The compiled artifact lives at
// libraries/e2e-helpers/dist/cjs/media-server.js — walk up four levels to
// reach the repo root and into servers/media/tests/fixtures.
export function fixturePath(rel: string): string {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
  return path.resolve(repoRoot, 'servers', 'media', 'tests', 'fixtures', rel)
}
