import { Logger } from '@nestjs/common'

import { envVar } from '../../utils/env'

const MIN_PORT = 1
const MAX_PORT = 65535

// The status endpoint resolves the pinned port on every poll, so a bad value is only worth saying once
let warnedAbout: string | null = null

export type PublicPortInputs = {
  mappedPort: number | null,
  pinnedPort: number | null,
  fallbackPort: number | null,
}

/**
 * The port the deployment pinned a dedicated Remote Access HTTPS listener to,
 * or null when it was left unset. Legacy: the main port answers TLS on its
 * own, so this is only for deployments whose external TLS port has to differ
 * from the main one.
 */
export function getPinnedHttpsPort(): number | null {
  const value = envVar('CONNECT_HTTPS_PORT', null)

  // Compose files pass an empty value to mean "unset", which envVar reads as 0
  if (value === null || value === undefined || value === '' || value === 0) {
    return null
  }

  const port = typeof value === 'number' ? value : NaN

  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    if (warnedAbout !== String(value)) {
      warnedAbout = String(value)
      Logger.warn(
        `Ignoring CONNECT_HTTPS_PORT="${value}": expected a port between ${MIN_PORT} and ${MAX_PORT}`,
        'RemoteAccess',
      )
    }

    return null
  }

  return port
}

/**
 * Parses a stored option into a port number, or null when it is missing or
 * not a usable port.
 */
export function toPort(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const port = Number(value)

  return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT ? port : null
}

/**
 * The port the Remote Access Server is told to reach this server on.
 *
 * A port mapping outranks everything, because only the router knows which
 * external port it opened. A pinned port comes next, being the one thing the
 * deployment said out loud. Failing both, the main port is the answer: it
 * serves TLS itself, and the published quick start forwards it 1:1.
 */
export function resolvePublicPort({ mappedPort, pinnedPort, fallbackPort }: PublicPortInputs): number | null {
  return mappedPort ?? pinnedPort ?? fallbackPort
}
