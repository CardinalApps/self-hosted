/* eslint-disable turbo/no-undeclared-env-vars -- tests drive the pinned port through the real env var */
import { Logger } from '@nestjs/common'

import { getPinnedHttpsPort, resolvePublicPort, toPort } from './ports'

let warn: jest.SpyInstance

beforeEach(() => {
  warn = jest.spyOn(Logger, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  delete process.env.CONNECT_HTTPS_PORT
  warn.mockRestore()
})

describe('getPinnedHttpsPort', () => {
  it('is null when the env var is not set', () => {
    expect(getPinnedHttpsPort()).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  it('returns the pinned port', () => {
    process.env.CONNECT_HTTPS_PORT = '8443'

    expect(getPinnedHttpsPort()).toBe(8443)
    expect(warn).not.toHaveBeenCalled()
  })

  // Compose files routinely pass an empty value for "leave this alone", which reads the same as 0
  it.each(['', '0'])('is quietly null for %s', (value) => {
    process.env.CONNECT_HTTPS_PORT = value

    expect(getPinnedHttpsPort()).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  it.each(['abc', 'true', '8443.5', '-1', '65536', '99999'])('warns and is null for %s', (value) => {
    process.env.CONNECT_HTTPS_PORT = value

    expect(getPinnedHttpsPort()).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  // The status endpoint resolves the port on every poll
  it('warns once about the value it keeps being asked about', () => {
    process.env.CONNECT_HTTPS_PORT = 'still-not-a-port'

    getPinnedHttpsPort()
    getPinnedHttpsPort()

    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('toPort', () => {
  it('parses a stored port', () => {
    expect(toPort('31234')).toBe(31234)
    expect(toPort(443)).toBe(443)
  })

  it.each([undefined, null, '', 'abc', '0', '-5', '70000', '1.5'])('is null for %s', (value) => {
    expect(toPort(value)).toBeNull()
  })
})

describe('resolvePublicPort', () => {
  const inputs = {
    mappedPort: null as number | null,
    upnpEnabled: false,
    pinnedPort: null as number | null,
    fallbackPort: 3080 as number | null,
  }

  it('falls back when nothing is known', () => {
    expect(resolvePublicPort({ ...inputs })).toBe(3080)
  })

  it('uses a mapped port when no port is pinned', () => {
    expect(resolvePublicPort({ ...inputs, mappedPort: 24901 })).toBe(24901)
  })

  it('uses the pinned port when nothing is mapped', () => {
    expect(resolvePublicPort({ ...inputs, pinnedPort: 8443 })).toBe(8443)
  })

  /* A port left behind by an earlier UPnP run points at a mapping the router no longer has, so it must
     not outrank a port the deployment forwards itself. */
  it('prefers the pinned port over a stale mapped port while UPnP is off', () => {
    expect(resolvePublicPort({ ...inputs, mappedPort: 24901, pinnedPort: 8443 })).toBe(8443)
  })

  it('prefers the live mapped port over the pinned port while UPnP is on', () => {
    expect(resolvePublicPort({ ...inputs, mappedPort: 24901, pinnedPort: 8443, upnpEnabled: true })).toBe(24901)
  })

  it('uses the pinned port while UPnP is on but has mapped nothing yet', () => {
    expect(resolvePublicPort({ ...inputs, pinnedPort: 8443, upnpEnabled: true })).toBe(8443)
  })

  it('can report nothing at all when the caller has no fallback', () => {
    expect(resolvePublicPort({ ...inputs, fallbackPort: null })).toBeNull()
  })
})
