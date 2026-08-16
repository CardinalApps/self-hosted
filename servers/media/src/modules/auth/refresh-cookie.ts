/*
 * Browsers key cookies by host and ignore the port, so every Media Server reachable at the same IP
 * writes into the same jar slot: logging into one overwrites the refresh tolkien of the other, and
 * whatever either server then does to that cookie it does to both sessions. Naming the cookie after
 * the instance gives each server its own slot. Remote Access hostnames are already unique per
 * server, so the namespace is merely redundant there.
 */

export const REFRESH_TOLKIEN_COOKIE_PREFIX = 'cardinal_refresh_tolkien'

export const REFRESH_COOKIE_PATH = '/api/v1/auth'

const INSTANCE_ID_LENGTH = 8

/**
 * Returns the refresh tolkien cookie name for a server with the given instance
 * ID. Refuses to name a cookie without one, since every server missing an
 * instance ID would land back in the shared slot this namespace exists to
 * escape. The server sets its instance ID before it serves a request.
 */
export function buildRefreshCookieName(instanceId: string): string {
  const suffix = typeof instanceId === 'string' ? instanceId.trim().slice(0, INSTANCE_ID_LENGTH) : ''

  if (!suffix) {
    throw new Error('Cannot name the refresh token cookie: this server has no instance ID.')
  }

  return `${REFRESH_TOLKIEN_COOKIE_PREFIX}_${suffix}`
}
