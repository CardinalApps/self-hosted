import { EventEmitter } from 'node:events'
import { encodeRelayBinaryFrame, WSS_CLOSE_FORBIDDEN, WSS_CLOSE_SUPERSEDED } from '@cardinalapps/remote-access/dist/cjs'

import { ConnectSDKService, ConnectWebSocket, getLocalIps } from './connect-sdk.service'
import { ConnectSDKEvents } from './connect-sdk.events'
import { ConnectAuthError, TokenRefresher } from './token-refresher'
import { DatabaseService } from '../../database/database.service'
import { OPTIONS } from '../../../utils/options'

class FakeWebSocket extends EventEmitter {
  url: string
  sent: string[] = []
  closeCalls: (number | undefined)[] = []
  terminated = false

  constructor(url: string) {
    super()
    this.url = url
  }

  send(data: string) {
    this.sent.push(String(data))
  }

  close(code?: number) {
    this.closeCalls.push(code)
  }

  terminate() {
    this.terminated = true
    this.emit('close', 1006)
  }

  // Test helpers
  open() {
    this.emit('open')
  }

  receive(message: Record<string, unknown>) {
    this.emit('message', Buffer.from(JSON.stringify(message)), false)
  }

  receiveBinary(frame: Uint8Array) {
    this.emit('message', Buffer.from(frame), true)
  }

  sentMessages(): Record<string, unknown>[] {
    return this.sent.map((raw) => JSON.parse(raw))
  }
}

function makeDb(initial: Record<string, string> = {}) {
  const options: Record<string, string> = { ...initial }
  return {
    options,
    getOption: jest.fn(async (name: string) => options[name]),
    saveOption: jest.fn(async (name: string, value: string) => {
      options[name] = value
      return {}
    }),
  }
}

function makeRefresher() {
  return {
    getCurrentToken: jest.fn(async () => 'access-jwt'),
    getServerTokenExpiry: jest.fn(async () => new Date(Date.now() + 1000000)),
    clear: jest.fn(),
  }
}

// Flushes pending microtasks without advancing fake timers
async function flush(passes = 10) {
  for (let i = 0; i < passes; i++) {
    await Promise.resolve()
  }
}

/*
 * Advances fake timers then flushes microtasks, so async work scheduled by a
 * fired timer (like a reconnect attempt) completes before assertions.
 * @types/jest is still on v28, which predates jest.advanceTimersByTimeAsync.
 */
async function advance(ms: number) {
  jest.advanceTimersByTime(ms)
  await flush()
}

const ENABLED_OPTIONS = {
  [OPTIONS.CONNECT_ENABLED.name]: 'true',
  [OPTIONS.INSTANCE_ID.name]: 'instance-1234',
  [OPTIONS.CONNECT_SERVER_TOKEN.name]: 'server-token',
}

function makeService(dbOptions: Record<string, string> = ENABLED_OPTIONS) {
  const db = makeDb(dbOptions)
  const refresher = makeRefresher()
  const events = new ConnectSDKEvents()
  const sockets: FakeWebSocket[] = []
  const factory = jest.fn((url: string) => {
    const ws = new FakeWebSocket(url)
    sockets.push(ws)
    return ws as unknown as ConnectWebSocket
  })
  const service = new ConnectSDKService(
    db as unknown as DatabaseService,
    refresher as unknown as TokenRefresher,
    events,
    factory,
  )
  return { service, db, refresher, events, factory, sockets }
}

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('ConnectSDKService', () => {
  it('does not open a socket on boot when connect is disabled', async () => {
    const { service, factory } = makeService({ [OPTIONS.CONNECT_ENABLED.name]: 'false' })

    await service.onApplicationBootstrap()
    await flush()

    expect(factory).not.toHaveBeenCalled()
  })

  it('opens a socket and registers on boot when enabled', async () => {
    const { service, factory, sockets } = makeService()

    await service.onApplicationBootstrap()
    await flush()

    expect(factory).toHaveBeenCalledTimes(1)
    expect(factory.mock.calls[0][0]).toContain('/connect?token=access-jwt')

    sockets[0].open()
    await flush()

    const register = sockets[0].sentMessages().find((m) => m.type === 'register')
    expect(register).toBeTruthy()
    expect(register!.instanceId).toBe('instance-1234')
    expect(typeof register!.publicPort).toBe('number')
    expect(Array.isArray(register!.localIps)).toBe(true)
    expect(typeof register!.version).toBe('string')
  })

  it('persists the registered payload and emits events', async () => {
    const { service, db, events, sockets } = makeService()
    const registeredEvents: unknown[] = []
    const certEvents: unknown[] = []
    events.on('registered', (payload) => registeredEvents.push(payload))
    events.on('cert:update', (payload) => certEvents.push(payload))

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    sockets[0].receive({
      type: 'registered',
      publicIp: '203.0.113.7',
      hostname: 'instance-1234.connect.cardinalapps.host',
      signingKey: Buffer.alloc(32, 7).toString('base64'),
      cert: { cert_pem: 'CERT', key_pem: 'KEY', not_after: new Date().toISOString() },
      config: {},
    })
    await flush()

    expect(db.options[OPTIONS.CONNECT_SIGNING_KEY.name]).toBe(Buffer.alloc(32, 7).toString('base64'))
    expect(db.options[OPTIONS.CONNECT_HOSTNAME.name]).toBe('instance-1234.connect.cardinalapps.host')
    expect(db.options[OPTIONS.CONNECT_TLS_CERT_PEM.name]).toBe('CERT')
    expect(db.options[OPTIONS.CONNECT_TLS_KEY_PEM.name]).toBe('KEY')
    expect(registeredEvents).toHaveLength(1)
    expect(certEvents).toHaveLength(1)
    expect((await service.getStatus()).state).toBe('connected')
  })

  it('does not emit cert:update when registered carries no cert', async () => {
    const { service, events, sockets } = makeService()
    const certEvents: unknown[] = []
    events.on('cert:update', (payload) => certEvents.push(payload))

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()
    sockets[0].receive({ type: 'registered', publicIp: '203.0.113.7', hostname: 'h', signingKey: 'a2V5', config: {} })
    await flush()

    expect(certEvents).toHaveLength(0)
  })

  it('sends a ping every 30 seconds and stays alive while pongs arrive', async () => {
    const { service, sockets } = makeService()
    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    await advance(30_000)
    expect(sockets[0].sentMessages().filter((m) => m.type === 'ping')).toHaveLength(1)

    sockets[0].receive({ type: 'pong' })
    await advance(30_000)
    sockets[0].receive({ type: 'pong' })

    expect(sockets[0].terminated).toBe(false)
  })

  it('force-closes the socket when no pong arrives within 90 seconds', async () => {
    const { service, sockets } = makeService()
    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    await advance(121_000)

    expect(sockets[0].terminated).toBe(true)
  })

  it('reconnects with exponential backoff and jitter after a dropped connection', async () => {
    const { service, factory, sockets } = makeService()
    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    // Drop the connection; first retry lands within 1s ± 25%
    sockets[0].emit('close', 1006)
    await advance(1_250)
    await flush()
    expect(factory).toHaveBeenCalledTimes(2)

    // Second drop: next delay is 2s ± 25% — nothing at 1.4s, connected by 2.5s
    sockets[1].emit('close', 1006)
    await advance(1_400)
    expect(factory).toHaveBeenCalledTimes(2)
    await advance(1_100)
    expect(factory).toHaveBeenCalledTimes(3)
  })

  it('caps the reconnect delay at 60 seconds', async () => {
    const { service, factory, sockets } = makeService()
    await service.connect()
    await flush()

    // Fail 10 times in a row to run the exponent past the cap
    for (let i = 0; i < 10; i++) {
      sockets[i].emit('close', 1006)
      await advance(76_000)
      await flush()
    }

    expect(factory).toHaveBeenCalledTimes(11)
  })

  it('applies jitter within ±25% of the base delay', async () => {
    const samples: number[] = []
    for (let i = 0; i < 10; i++) {
      const { service, sockets } = makeService()
      const spy = jest.spyOn(global, 'setTimeout')
      await service.connect()
      await flush()
      sockets[0].emit('close', 1006)
      const delays = spy.mock.calls.map((call) => call[1] as number).filter((ms) => ms >= 500 && ms <= 1500)
      expect(delays).toHaveLength(1)
      samples.push(delays[0])
      await service.disconnect()
      spy.mockRestore()
    }

    for (const delay of samples) {
      expect(delay).toBeGreaterThanOrEqual(750)
      expect(delay).toBeLessThanOrEqual(1250)
    }
  })

  it('disconnect() disables the option, closes with 1000, and cancels reconnection', async () => {
    const { service, db, factory, sockets } = makeService()
    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    await service.disconnect()

    expect(db.options[OPTIONS.CONNECT_ENABLED.name]).toBe('false')
    expect(sockets[0].closeCalls).toContain(1000)

    // No reconnect attempts follow
    sockets[0].emit('close', 1000)
    await advance(300_000)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('does not reconnect after the server closes with 4001 (owner mismatch)', async () => {
    const { service, factory, sockets } = makeService()
    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    sockets[0].emit('close', WSS_CLOSE_FORBIDDEN)
    await advance(300_000)

    expect(factory).toHaveBeenCalledTimes(1)
    expect((await service.getStatus()).state).toBe('auth_failed')
  })

  it('does not reconnect after being superseded (4000)', async () => {
    const { service, factory, sockets } = makeService()
    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    sockets[0].emit('close', WSS_CLOSE_SUPERSEDED)
    await advance(300_000)

    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('disables connect and reports auth_failed when the token refresh is rejected', async () => {
    const { service, db, refresher, factory } = makeService()
    refresher.getCurrentToken.mockRejectedValue(new ConnectAuthError('revoked'))

    await service.connect()
    await flush()

    expect(factory).not.toHaveBeenCalled()
    expect(db.options[OPTIONS.CONNECT_ENABLED.name]).toBe('false')
    expect((await service.getStatus()).state).toBe('auth_failed')
  })

  it('retries later when the cloud is unreachable during token refresh', async () => {
    const { service, db, refresher, factory } = makeService()
    refresher.getCurrentToken.mockRejectedValueOnce(new Error('fetch failed'))

    await service.connect()
    await flush()
    expect(factory).not.toHaveBeenCalled()
    // Still enabled — this is a transient failure
    expect(db.options[OPTIONS.CONNECT_ENABLED.name]).toBe('true')

    await advance(1_250)
    await flush()
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('persists a rotated signing key from config:update and emits the event', async () => {
    const { service, db, events, sockets } = makeService()
    const configEvents: unknown[] = []
    events.on('config:update', (payload) => configEvents.push(payload))

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    sockets[0].receive({ type: 'config:update', signingKey: 'bmV3LWtleQ==' })
    await flush()

    expect(db.options[OPTIONS.CONNECT_SIGNING_KEY.name]).toBe('bmV3LWtleQ==')
    expect(configEvents).toHaveLength(1)
  })

  it('emits relay and binary frame events for the relay tickets to consume', async () => {
    const { service, events, sockets } = makeService()
    const relayRequests: unknown[] = []
    const frames: { requestId: string, chunk: Uint8Array }[] = []
    events.on('relay:http:request', (payload) => relayRequests.push(payload))
    events.on('binary:frame', (payload) => frames.push(payload))

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    sockets[0].receive({ type: 'relay:http:request', requestId: 'req-1', method: 'GET', path: '/api/ping', headers: {} })
    sockets[0].receiveBinary(encodeRelayBinaryFrame('req-1', new Uint8Array([1, 2, 3])))
    await flush()

    expect(relayRequests).toHaveLength(1)
    expect(frames).toHaveLength(1)
    expect(frames[0].requestId).toBe('req-1')
    expect(Array.from(frames[0].chunk)).toEqual([1, 2, 3])
  })
})

describe('getLocalIps', () => {
  const v4 = (address: string, internal = false) => ({
    address,
    netmask: '255.255.255.0',
    family: 'IPv4' as const,
    mac: '00:00:00:00:00:00',
    internal,
    cidr: `${address}/24`,
  })
  const v6 = (address: string, scopeid = 0, internal = false) => ({
    address,
    netmask: 'ffff:ffff:ffff:ffff::',
    family: 'IPv6' as const,
    mac: '00:00:00:00:00:00',
    internal,
    scopeid,
    cidr: `${address}/64`,
  })

  it('collects external IPv4 plus global and ULA IPv6', () => {
    const ips = getLocalIps({
      eth0: [v4('192.168.1.40'), v6('2001:db8::5'), v6('fd00::5')],
    })
    expect(ips).toEqual(['192.168.1.40', '2001:db8::5', 'fd00::5'])
  })

  it('excludes internal, v4 link-local, and v6 link-local addresses', () => {
    const ips = getLocalIps({
      lo: [v4('127.0.0.1', true), v6('::1', 0, true)],
      eth0: [v4('169.254.10.4'), v6('fe80::1', 2), v6('fe80::2', 3)],
    })
    expect(ips).toEqual([])
  })
})
