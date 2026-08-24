import {
  test,
  expect,
  describe,
} from '@jest/globals'

import {
  HEADERS,
  MESSAGE_TYPES,
  DEFAULT_MEDIA_SERVER_PORT,
  WSS_PATH,
  WSS_CLOSE_SUPERSEDED,
  WSS_CLOSE_FORBIDDEN,
  WSS_CLOSE_PING_TIMEOUT,
  PROBE_TIMESTAMP_SKEW_SECONDS,
  PROTOCOL_VERSION,
} from '../src'

describe('HEADERS', () => {
  test('exposes every Cardinal protocol header name', () => {
    expect(HEADERS.PROBE).toBe('X-Cardinal-Probe')
    expect(HEADERS.PROBE_SIGNATURE).toBe('X-Cardinal-Probe-Signature')
    expect(HEADERS.PROBE_PONG).toBe('X-Cardinal-Probe-Pong')
    expect(HEADERS.CONNECTION).toBe('X-Cardinal-Connection')
  })

  // `as const` narrowing: the property type must be the literal, not `string`.
  test('values are narrowed to literal string types', () => {
    const probe: 'X-Cardinal-Probe' = HEADERS.PROBE
    expect(probe).toBe('X-Cardinal-Probe')
  })
})

describe('MESSAGE_TYPES', () => {
  test('lists every control-message type string from design §8', () => {
    // Media Server → Remote Access Server
    expect(MESSAGE_TYPES.REGISTER).toBe('register')
    expect(MESSAGE_TYPES.PING).toBe('ping')
    expect(MESSAGE_TYPES.RELAY_HTTP_RESPONSE_START).toBe('relay:http:response:start')
    expect(MESSAGE_TYPES.RELAY_HTTP_RESPONSE_END).toBe('relay:http:response:end')
    expect(MESSAGE_TYPES.RELAY_ABORT).toBe('relay:abort')

    // Remote Access Server → Media Server
    expect(MESSAGE_TYPES.REGISTERED).toBe('registered')
    expect(MESSAGE_TYPES.PONG).toBe('pong')
    expect(MESSAGE_TYPES.CONFIG_UPDATE).toBe('config:update')
    expect(MESSAGE_TYPES.CERT_UPDATE).toBe('cert:update')
    expect(MESSAGE_TYPES.RELAY_HTTP_REQUEST).toBe('relay:http:request')
  })
})

describe('numeric and string constants', () => {
  test('DEFAULT_MEDIA_SERVER_PORT is 24900', () => {
    expect(DEFAULT_MEDIA_SERVER_PORT).toBe(24900)
  })

  test('WSS_PATH is /connect', () => {
    expect(WSS_PATH).toBe('/connect')
  })

  test('WSS close codes match design §8', () => {
    expect(WSS_CLOSE_SUPERSEDED).toBe(4000)
    expect(WSS_CLOSE_FORBIDDEN).toBe(4001)
    expect(WSS_CLOSE_PING_TIMEOUT).toBe(4002)
  })

  test('PROBE_TIMESTAMP_SKEW_SECONDS is 5 minutes', () => {
    expect(PROBE_TIMESTAMP_SKEW_SECONDS).toBe(5 * 60)
  })

  test('PROTOCOL_VERSION is 1', () => {
    expect(PROTOCOL_VERSION).toBe(1)
  })
})
