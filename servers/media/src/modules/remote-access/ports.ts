import { Logger } from '@nestjs/common'

import { envVar } from '../../utils/env'

const MIN_PORT = 1
const MAX_PORT = 65535

// The status endpoint resolves the pinned port on every poll, so a bad value is only worth saying once
let warnedAbout: string | null = null

export type PublicPortInputs = {
  mappedPort: number | null,
  upnpEnabled: boolean,
  pinnedPort: number | null,
  fallbackPort: number | null,
}

/**
 * The port the deployment pinned the Remote Access HTTPS listener to, or null
 * when it was left unset. Pinning is what makes the direct path usable behind
 * a published container port or a hand-written port forward, where the
 * anti-scan random port cannot be reached.
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
 */
export function resolvePublicPort({ mappedPort, upnpEnabled, pinnedPort, fallbackPort }: PublicPortInputs): number | null {
  /* Only a live UPnP mapping knows which external port the router actually opened, so it outranks the
     pin. With UPnP off, a stored public port is a leftover from an earlier run pointing at a mapping
     the router no longer has, while the pin is the port the deployment really forwards. */
  if (upnpEnabled && mappedPort) {
    return mappedPort
  }

  return pinnedPort ?? mappedPort ?? fallbackPort
}
