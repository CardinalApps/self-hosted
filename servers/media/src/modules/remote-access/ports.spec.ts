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
    pinnedPort: null as number | null,
    fallbackPort: 24900 as number | null,
  }

  /* The main port serves TLS, and the quick start publishes it 1:1, so a server that was told
     nothing is reachable on exactly the port it already listens on. */
  it('falls back to the main port when nothing is known', () => {
    expect(resolvePublicPort({ ...inputs })).toBe(24900)
  })

  it('uses a mapped port when no port is pinned', () => {
    expect(resolvePublicPort({ ...inputs, mappedPort: 24901 })).toBe(24901)
  })

  it('uses the pinned port when nothing is mapped', () => {
    expect(resolvePublicPort({ ...inputs, pinnedPort: 8443 })).toBe(8443)
  })

  // Only the mapping knows which external port the router actually opened
  it('prefers the mapped port over the pinned port', () => {
    expect(resolvePublicPort({ ...inputs, mappedPort: 24901, pinnedPort: 8443 })).toBe(24901)
  })

  it('prefers the pinned port over the main port', () => {
    expect(resolvePublicPort({ ...inputs, pinnedPort: 8443 })).toBe(8443)
  })

  it('can report nothing at all when the caller has no fallback', () => {
    expect(resolvePublicPort({ ...inputs, fallbackPort: null })).toBeNull()
  })
})
