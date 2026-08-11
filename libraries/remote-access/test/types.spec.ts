// @ts-nocheck — exercises type-narrowing on discriminated unions at runtime.
// The compile-time guarantees are covered by the dedicated `types.compile.test-d.ts`
// patterns; here we just verify the shape is usable at runtime.

import {
  test,
  expect,
  describe,
} from '@jest/globals'

import type {
  ConnectionInfo,
  MediaToServerMessage,
  ServerToMediaMessage,
  CertPayload,
} from '../src'

describe('discriminated unions narrow on `type`', () => {
  test('MediaToServerMessage register branch', () => {
    const msg: MediaToServerMessage = {
      type: 'register',
      instanceId: 'abc',
      publicPort: 24900,
      localIps: ['10.0.0.5'],
      version: '0.1.0',
    }
    if (msg.type === 'register') {
      expect(msg.instanceId).toBe('abc')
      expect(msg.publicPort).toBe(24900)
      expect(msg.localIps).toEqual(['10.0.0.5'])
    } else {
      throw new Error('narrowing failed')
    }
  })

  test('MediaToServerMessage register accepts optional byoHostname (Path 1)', () => {
    const msg: MediaToServerMessage = {
      type: 'register',
      instanceId: 'abc',
      publicPort: 24900,
      localIps: [],
      version: '0.1.0',
      byoHostname: 'media.example.com',
    }
    if (msg.type === 'register') {
      expect(msg.byoHostname).toBe('media.example.com')
    }
  })

  test('ServerToMediaMessage registered branch carries optional cert', () => {
    const cert: CertPayload = {
      cert_pem: '-----BEGIN CERTIFICATE-----',
      key_pem: '-----BEGIN PRIVATE KEY-----',
      not_after: '2027-01-01T00:00:00.000Z',
    }
    const msg: ServerToMediaMessage = {
      type: 'registered',
      publicIp: '203.0.113.5',
      hostname: 'abc.connect.cardinalapps.host',
      signingKey: 'base64-key',
      cert,
      config: { foo: 'bar' },
    }
    if (msg.type === 'registered') {
      expect(msg.cert?.cert_pem).toMatch(/CERTIFICATE/)
      expect(msg.hostname).toBe('abc.connect.cardinalapps.host')
    }
  })

  test('ConnectionInfo offline server omits direct block and has no candidates', () => {
    const info: ConnectionInfo = {
      online: false,
      candidates: [],
      relay: { url: 'https://relay.cardinalapps.host/relay/abc', enabled: false },
    }
    expect(info.direct).toBeUndefined()
    expect(info.relay.enabled).toBe(false)
  })

  test('ConnectionInfo candidates order LAN before WAN', () => {
    const info: ConnectionInfo = {
      online: true,
      candidates: [
        { kind: 'lan', hostname: '192-168-1-40.abc.connect.cardinalapps.host', port: 32400 },
        { kind: 'wan', hostname: '203-0-113-4.abc.connect.cardinalapps.host', port: 32400 },
      ],
      relay: { url: 'https://relay.cardinalapps.host/relay/abc', enabled: true },
    }
    expect(info.candidates[0].kind).toBe('lan')
    expect(info.candidates.map((c) => c.kind)).toEqual(['lan', 'wan'])
  })

  test('relay:http:request narrows on path/method/headers', () => {
    const msg: ServerToMediaMessage = {
      type: 'relay:http:request',
      requestId: 'r-1',
      method: 'GET',
      path: '/api/user',
      headers: { authorization: 'Bearer x' },
    }
    if (msg.type === 'relay:http:request') {
      expect(msg.method).toBe('GET')
      expect(msg.headers.authorization).toBe('Bearer x')
    }
  })
})
