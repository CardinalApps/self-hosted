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
}): Promise<{ libraryId: string }> {
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
