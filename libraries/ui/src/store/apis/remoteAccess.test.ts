import { describe, it, expect } from 'vitest'

import { connectUrls, parseVanityError } from './remoteAccess'
import type { ConnectStatus } from './remoteAccess'

const status = (overrides: Partial<ConnectStatus> = {}): ConnectStatus => ({
  enabled: true,
  state: 'connected',
  hostname: 'a1b2c3d4.connect.cardinalapps.host',
  vanityHostname: null,
  signingKeyFingerprint: null,
  tokenExpiresAt: null,
  publicPort: 8443,
  directUrl: 'https://a1b2c3d4.connect.cardinalapps.host:8443',
  relayUrl: null,
  https: { state: 'running', port: 8443, certExpiresAt: null, lastError: null },
  ...overrides,
})

describe('parseVanityError', () => {
  it('reads the Remote Access Server codes the media server passes through', () => {
    expect(parseVanityError({ status: 422, data: { error: 'invalid_name' } }).code).toBe('invalid_name')
    expect(parseVanityError({ status: 409, data: { error: 'name_unavailable' } }).code).toBe('name_unavailable')
    expect(parseVanityError({ status: 503, data: { error: 'vanity_disabled' } }).code).toBe('vanity_disabled')
  })

  it('keeps the numbers that the copy has to quote', () => {
    expect(parseVanityError({ status: 409, data: { error: 'label_limit_reached', limit: 3 } })).toMatchObject({
      code: 'label_limit_reached',
      limit: 3,
    })
    expect(parseVanityError({ status: 429, data: { error: 'rename_cooldown', retryAfterSeconds: 604800 } })).toMatchObject({
      code: 'rename_cooldown',
      retryAfterSeconds: 604800,
    })
  })

  it('reads a deferred certificate off a body that also carries the vanity view', () => {
    const error = parseVanityError({
      status: 402,
      data: { error: 'cert_unavailable', labels: ['brianflix'], primary: 'brianflix', state: 'pending' },
    })

    expect(error.code).toBe('cert_unavailable')
    expect(error.status).toBe(402)
  })

  /* Nest owns the 400, so its body has no vanity code in it — and `error` there is the HTTP status
     text, which must not be mistaken for one of the Remote Access Server's codes. */
  it('treats the media server\'s own 400 as the feature being unavailable', () => {
    const error = parseVanityError({
      status: 400,
      data: { statusCode: 400, message: 'Remote Access is not enabled on this server.', error: 'Bad Request' },
    })

    expect(error.code).toBe('not_available')
  })

  it('falls back to unknown for anything else', () => {
    expect(parseVanityError({ status: 'FETCH_ERROR', error: 'offline' })).toMatchObject({ code: 'unknown', status: null })
    expect(parseVanityError(undefined).code).toBe('unknown')
    expect(parseVanityError({ status: 500, data: { error: 'internal_error' } }).code).toBe('unknown')
  })
})

describe('connectUrls', () => {
  it('derives the vanity URL from the assigned one while the name is still pending', () => {
    expect(connectUrls(status(), 'brianflix')).toEqual({
      assigned: 'https://a1b2c3d4.connect.cardinalapps.host:8443',
      vanity: 'https://brianflix.connect.cardinalapps.host:8443',
    })
  })

  // Once the name is live the media server's directUrl already points at it, so the assigned row has to be rebuilt
  it('keeps the assigned URL reachable once the vanity name is live', () => {
    const live = status({
      vanityHostname: 'brianflix.connect.cardinalapps.host',
      directUrl: 'https://brianflix.connect.cardinalapps.host:8443',
    })

    expect(connectUrls(live, 'brianflix')).toEqual({
      assigned: 'https://a1b2c3d4.connect.cardinalapps.host:8443',
      vanity: 'https://brianflix.connect.cardinalapps.host:8443',
    })
  })

  it('omits the port when the server is reachable on 443', () => {
    const portless = status({ publicPort: 443, directUrl: 'https://a1b2c3d4.connect.cardinalapps.host' })

    expect(connectUrls(portless, 'brianflix')).toEqual({
      assigned: 'https://a1b2c3d4.connect.cardinalapps.host',
      vanity: 'https://brianflix.connect.cardinalapps.host',
    })
  })

  it('has no URLs to offer before the server is registered', () => {
    expect(connectUrls(status({ hostname: null, directUrl: null }), 'brianflix')).toEqual({ assigned: null, vanity: null })
    expect(connectUrls(undefined, 'brianflix')).toEqual({ assigned: null, vanity: null })
  })

  it('has no vanity URL without a name', () => {
    expect(connectUrls(status(), null).vanity).toBeNull()
  })
})
