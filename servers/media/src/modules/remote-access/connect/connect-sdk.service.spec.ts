/* eslint-disable turbo/no-undeclared-env-vars -- tests drive the advertised port through the real env vars */
import { EventEmitter } from 'node:events'
import { Logger } from '@nestjs/common'
import {
  encodeRelayBinaryFrame,
  WSS_CLOSE_BANNED,
  WSS_CLOSE_FORBIDDEN,
  WSS_CLOSE_NOT_APPROVED,
  WSS_CLOSE_PING_TIMEOUT,
  WSS_CLOSE_SUPERSEDED,
} from '@cardinalapps/remote-access/dist/cjs'

jest.mock('@cardinalapps/topology/dist/cjs', () => ({
  ...jest.requireActual('@cardinalapps/topology/dist/cjs'),
  fetchAuthAPI: jest.fn(),
  fetchRemoteAccessAPI: jest.fn(),
}))

import { fetchAuthAPI, fetchRemoteAccessAPI } from '@cardinalapps/topology/dist/cjs'

import {
  CloudEnableError,
  ConnectSDKService,
  ConnectWebSocket,
  ENABLE_REMOTE_ACCESS,
  getLocalIps,
  resolveLanIps,
  SERVICE_ACCESS_REQUIRED,
  SLOW_RETRY_MS,
  VanityUnavailableError,
} from './connect-sdk.service'
import { ConnectSDKEvents } from './connect-sdk.events'
import { HttpsStatusStore } from './https-status.store'
import { SettingsService } from '../../settings/settings.service'
import { SettingsEvents } from '../../settings/events'
import { EventService } from '../../event/event.service'
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

function makeSettings(initial: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = { ...initial }
  return {
    values,
    get: jest.fn(async (app: unknown, name: string) => (name in values ? values[name] : null)),
    set: jest.fn(async (app: unknown, settings: Record<string, unknown>) => {
      Object.assign(values, settings)
      return []
    }),
  }
}

// Stands in for the private event channel the settings module publishes on
function makeEventService() {
  const subscribers: Record<string, ((payload: unknown) => void)[]> = {}
  return {
    subscribePrivate: jest.fn((instance: unknown, type: string, subscriber: (payload: unknown) => void) => {
      subscribers[type] = [...(subscribers[type] ?? []), subscriber]
    }),
    emitPrivate: jest.fn((type: string, payload?: unknown) => {
      (subscribers[type] ?? []).forEach((subscriber) => subscriber(payload))
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

const mockedFetchAuthAPI = fetchAuthAPI as jest.Mock
const mockedFetchRemoteAccessAPI = fetchRemoteAccessAPI as jest.Mock

// The cloud IDP's answers to a server-token mint
const cloudResponses = {
  minted: (serverToken = 'server-token') => ({ status: 201, json: async () => ({ serverToken }) }),
  gated: () => ({ status: 403, json: async () => ({ message: 'Access has not been approved.', code: SERVICE_ACCESS_REQUIRED }) }),
  slotsExhausted: () => ({ status: 409, json: async () => ({ message: 'Every server slot is in use.', code: 'server_slots_exhausted' }) }),
  suspended: () => ({ status: 403, json: async () => ({ message: 'This account is suspended.', code: 'account_suspended' }) }),
  expiredJwt: () => ({ status: 401, json: async () => ({ message: 'Invalid or expired token.' }) }),
  serverError: () => ({ status: 500, json: async () => ({ message: 'Something went wrong.' }) }),
  rateLimited: () => ({ status: 429, json: async () => ({ message: 'Slow down.' }) }),
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

function makeService(dbOptions: Record<string, string> = ENABLED_OPTIONS, initialSettings: Record<string, unknown> = {}) {
  const db = makeDb(dbOptions)
  const settings = makeSettings(initialSettings)
  const eventService = makeEventService()
  const refresher = makeRefresher()
  const events = new ConnectSDKEvents()
  const sockets: FakeWebSocket[] = []
  const factory = jest.fn((url: string) => {
    const ws = new FakeWebSocket(url)
    sockets.push(ws)
    return ws as unknown as ConnectWebSocket
  })
  const httpsStatusStore = new HttpsStatusStore()
  const service = new ConnectSDKService(
    db as unknown as DatabaseService,
    refresher as unknown as TokenRefresher,
    events,
    httpsStatusStore,
    settings as unknown as SettingsService,
    eventService as unknown as EventService,
    factory,
  )
  return { service, db, refresher, events, factory, sockets, httpsStatusStore, settings, eventService }
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

  it('persists the vanity hostname a register vouches for', async () => {
    const { service, db, sockets } = makeService()

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    sockets[0].receive({
      type: 'registered',
      publicIp: '203.0.113.7',
      hostname: 'instance-1234.connect.cardinalapps.host',
      signingKey: 'a2V5',
      config: { vanityHostname: 'brians-server.connect.cardinalapps.host' },
    })
    await flush()

    expect(db.options[OPTIONS.CONNECT_VANITY_HOSTNAME.name]).toBe('brians-server.connect.cardinalapps.host')
  })

  /* A register is the authoritative statement, so a cloud too old to send the key is one that vouches for
     no vanity name — leaving a stale one in place would keep naming a certificate nobody holds. */
  it('retracts a stored vanity hostname when a register does not name one', async () => {
    const { service, db, sockets } = makeService({
      ...ENABLED_OPTIONS,
      [OPTIONS.CONNECT_VANITY_HOSTNAME.name]: 'brians-server.connect.cardinalapps.host',
    })

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    sockets[0].receive({ type: 'registered', publicIp: '203.0.113.7', hostname: 'h', signingKey: 'a2V5', config: {} })
    await flush()

    expect(db.options[OPTIONS.CONNECT_VANITY_HOSTNAME.name]).toBe('')
  })

  it('applies a vanity hostname sent as a config:update patch', async () => {
    const { service, db, sockets } = makeService()

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    sockets[0].receive({ type: 'config:update', vanityHostname: 'brians-server.connect.cardinalapps.host' })
    await flush()

    expect(db.options[OPTIONS.CONNECT_VANITY_HOSTNAME.name]).toBe('brians-server.connect.cardinalapps.host')
  })

  it('retracts the vanity hostname on an explicit null in a config:update', async () => {
    const { service, db, sockets } = makeService({
      ...ENABLED_OPTIONS,
      [OPTIONS.CONNECT_VANITY_HOSTNAME.name]: 'brians-server.connect.cardinalapps.host',
    })

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    sockets[0].receive({ type: 'config:update', vanityHostname: null })
    await flush()

    expect(db.options[OPTIONS.CONNECT_VANITY_HOSTNAME.name]).toBe('')
  })

  // A patch, not a snapshot: an update about something else says nothing about the vanity name
  it('leaves the vanity hostname alone when a config:update omits the key', async () => {
    const { service, db, sockets } = makeService({
      ...ENABLED_OPTIONS,
      [OPTIONS.CONNECT_VANITY_HOSTNAME.name]: 'brians-server.connect.cardinalapps.host',
    })

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    sockets[0].receive({ type: 'config:update', signingKey: 'bmV3LWtleQ==' })
    await flush()

    expect(db.options[OPTIONS.CONNECT_VANITY_HOSTNAME.name]).toBe('brians-server.connect.cardinalapps.host')
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

describe('ConnectSDKService connection paths', () => {
  const DIRECT = 'enable_remote_access_direct'
  const RELAY = 'enable_remote_access_relay'

  // Both settings default to on, so a fresh server offers both paths
  it('treats an unwritten path setting as enabled', async () => {
    const { service } = makeService()

    expect(await service.isPathEnabled(DIRECT)).toBe(true)
    expect(await service.isPathEnabled(RELAY)).toBe(true)
  })

  it('reports a path as disabled once its setting is off', async () => {
    const { service } = makeService(ENABLED_OPTIONS, { [RELAY]: false })

    expect(await service.isPathEnabled(DIRECT)).toBe(true)
    expect(await service.isPathEnabled(RELAY)).toBe(false)
  })

  it('announces a direct change so the listener can react', async () => {
    const { service, events, settings, eventService } = makeService()
    const directEvents: boolean[] = []
    events.on('direct:changed', (enabled) => directEvents.push(enabled))

    await service.onApplicationBootstrap()
    settings.values[DIRECT] = false
    eventService.emitPrivate(SettingsEvents.CHANGED, { names: [DIRECT] })
    await flush()

    expect(directEvents).toEqual([false])
  })

  it('announces a relay change so the relay handler can react', async () => {
    const { service, events, settings, eventService } = makeService()
    const relayEvents: boolean[] = []
    events.on('relay:changed', (enabled) => relayEvents.push(enabled))

    await service.onApplicationBootstrap()
    settings.values[RELAY] = false
    eventService.emitPrivate(SettingsEvents.CHANGED, { names: [RELAY] })
    await flush()

    expect(relayEvents).toEqual([false])
  })

  it('ignores settings changes that have nothing to do with the paths', async () => {
    const { service, events, eventService } = makeService()
    const seen: boolean[] = []
    events.on('direct:changed', (enabled) => seen.push(enabled))
    events.on('relay:changed', (enabled) => seen.push(enabled))

    await service.onApplicationBootstrap()
    eventService.emitPrivate(SettingsEvents.CHANGED, { names: ['server_name'] })
    await flush()

    expect(seen).toEqual([])
  })

  it('carries the path flags in the register message', async () => {
    const { service, sockets } = makeService(ENABLED_OPTIONS, { [RELAY]: false })

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    const register = sockets[0].sentMessages().find((m) => m.type === 'register')
    expect(register!.directEnabled).toBe(true)
    expect(register!.relayEnabled).toBe(false)
  })

  // The server only learns about a path being turned off if it is told again
  it('re-registers after a path changes while the channel is up', async () => {
    const { service, sockets, settings, eventService } = makeService()

    await service.onApplicationBootstrap()
    await flush()
    sockets[0].open()
    await flush()
    sockets[0].receive({ type: 'registered', publicIp: '203.0.113.7', hostname: 'h', signingKey: 'a2V5', config: {} })
    await flush()

    settings.values[RELAY] = false
    eventService.emitPrivate(SettingsEvents.CHANGED, { names: [RELAY] })
    await flush()

    const registers = sockets[0].sentMessages().filter((m) => m.type === 'register')
    expect(registers).toHaveLength(2)
    expect(registers[1].relayEnabled).toBe(false)
  })

  it('does not re-register while the channel is down', async () => {
    const { service, sockets, settings, eventService } = makeService({ [OPTIONS.CONNECT_ENABLED.name]: 'false' })

    await service.onApplicationBootstrap()
    settings.values[RELAY] = false
    eventService.emitPrivate(SettingsEvents.CHANGED, { names: [RELAY] })
    await flush()

    expect(sockets).toHaveLength(0)
  })
})

describe('ConnectSDKService enabled setting', () => {
  const ENABLE = 'enable_remote_access'

  /* The Admin app reads this setting rather than the status endpoint, so it has to track the
     option everywhere the option changes - including when the cloud rejects the credential. */
  it('mirrors the enabled state into the setting when connect is disabled', async () => {
    const { service, db, settings } = makeService()

    await service.disconnect()

    expect(db.options[OPTIONS.CONNECT_ENABLED.name]).toBe('false')
    expect(settings.values[ENABLE]).toBe(false)
  })

  it('mirrors the enabled state into the setting when the token is revoked', async () => {
    const { service, db, refresher, settings } = makeService()
    refresher.getCurrentToken.mockRejectedValueOnce(new ConnectAuthError('revoked'))

    await service.connect()
    await flush()

    expect(db.options[OPTIONS.CONNECT_ENABLED.name]).toBe('false')
    expect(settings.values[ENABLE]).toBe(false)
  })
})

describe('ConnectSDKService access gate', () => {
  // Connects and opens a socket, then hands back the harness
  async function live(dbOptions: Record<string, string> = ENABLED_OPTIONS) {
    const harness = makeService(dbOptions)
    await harness.service.connect()
    await flush()
    harness.sockets[0].open()
    await flush()
    return harness
  }

  it('lands in suspended after a 4005 close instead of the fatal auth_failed', async () => {
    const { service, sockets } = await live()

    sockets[0].emit('close', WSS_CLOSE_BANNED)
    await flush()

    expect((await service.getStatus()).state).toBe('suspended')
  })

  it('lands in not_approved after a 4004 close', async () => {
    const { service, sockets } = await live()

    sockets[0].emit('close', WSS_CLOSE_NOT_APPROVED)
    await flush()

    expect((await service.getStatus()).state).toBe('not_approved')
  })

  // A lifted suspension has to recover on its own, but slowly enough to not hammer the server
  it.each([
    ['a suspension', WSS_CLOSE_BANNED],
    ['a refused access gate', WSS_CLOSE_NOT_APPROVED],
    ['an unknown application close code', 4006],
  ])('retries %s on the slow cadence rather than the backoff schedule', async (_label, code) => {
    const { factory, sockets } = await live()

    sockets[0].emit('close', code)
    await advance(60_000)
    expect(factory).toHaveBeenCalledTimes(1)

    await advance(SLOW_RETRY_MS)
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('keeps the fast backoff for a ping-timeout close', async () => {
    const { factory, sockets } = await live()

    sockets[0].emit('close', WSS_CLOSE_PING_TIMEOUT)
    await advance(1_250)

    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('stops retrying a suspension once the owner turns Remote Access off', async () => {
    const { service, factory, sockets } = await live()

    sockets[0].emit('close', WSS_CLOSE_BANNED)
    await flush()
    await service.disconnect()
    await advance(SLOW_RETRY_MS * 2)

    expect(factory).toHaveBeenCalledTimes(1)
  })
})

describe('ConnectSDKService enable', () => {
  const DISABLED_OPTIONS = { [OPTIONS.INSTANCE_ID.name]: 'instance-1234' }

  beforeEach(() => {
    mockedFetchAuthAPI.mockReset()
  })

  it('stores the minted token, enables, and opens the channel', async () => {
    const { service, db, settings, factory } = makeService(DISABLED_OPTIONS)
    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.minted())

    await service.enable('admin-jwt')
    await flush()

    expect(db.options[OPTIONS.CONNECT_SERVER_TOKEN.name]).toBe('server-token')
    expect(db.options[OPTIONS.CONNECT_ENABLED.name]).toBe('true')
    expect(settings.values[ENABLE_REMOTE_ACCESS]).toBe(true)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  /* The refusal is the queue entry, so the server waits it out instead of making the owner
     come back and try again. */
  it('reports the gate refusal with its code', async () => {
    const { service } = makeService(DISABLED_OPTIONS)
    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.gated())

    await expect(service.enable('admin-jwt')).rejects.toMatchObject({
      status: 403,
      code: SERVICE_ACCESS_REQUIRED,
    })

    expect((await service.getStatus()).state).toBe('not_approved')
  })

  /* Asking is the whole of the owner's part, so the toggle they flipped stays where they left it.
     The option behind it does not move: there is no channel to bring up until the mint succeeds. */
  it('records the ask in the setting the Admin app reads while the wait runs', async () => {
    const { service, db, settings } = makeService(DISABLED_OPTIONS)
    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.gated())

    await expect(service.enable('admin-jwt')).rejects.toBeInstanceOf(CloudEnableError)

    expect(settings.values[ENABLE_REMOTE_ACCESS]).toBe(true)
    expect(db.options[OPTIONS.CONNECT_ENABLED.name]).toBeUndefined()
  })

  // Turning the toggle back off is the only way out of the queue, so it has to end the wait
  it('clears the setting and stops waiting when the owner turns it off again', async () => {
    const { service, settings } = makeService(DISABLED_OPTIONS)
    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.gated())

    await expect(service.enable('admin-jwt')).rejects.toBeInstanceOf(CloudEnableError)
    expect(settings.values[ENABLE_REMOTE_ACCESS]).toBe(true)

    await service.disable()
    await advance(SLOW_RETRY_MS * 2)

    expect(settings.values[ENABLE_REMOTE_ACCESS]).toBe(false)
    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(1)
  })

  it('leaves the setting off when the refusal is not something waiting can fix', async () => {
    const { service, settings } = makeService(DISABLED_OPTIONS)
    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.slotsExhausted())

    await expect(service.enable('admin-jwt')).rejects.toMatchObject({ status: 409 })

    expect(settings.values[ENABLE_REMOTE_ACCESS]).toBeUndefined()
  })

  it('finishes enabling when a later retry finds the account approved', async () => {
    const { service, db, factory } = makeService(DISABLED_OPTIONS)
    mockedFetchAuthAPI
      .mockResolvedValueOnce(cloudResponses.gated())
      .mockResolvedValueOnce(cloudResponses.minted('approved-token'))

    await expect(service.enable('admin-jwt')).rejects.toBeInstanceOf(CloudEnableError)
    await advance(SLOW_RETRY_MS)

    expect(db.options[OPTIONS.CONNECT_SERVER_TOKEN.name]).toBe('approved-token')
    expect(db.options[OPTIONS.CONNECT_ENABLED.name]).toBe('true')
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('keeps retrying while the account is still waiting for approval', async () => {
    const { service } = makeService(DISABLED_OPTIONS)
    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.gated())

    await expect(service.enable('admin-jwt')).rejects.toBeInstanceOf(CloudEnableError)
    await advance(SLOW_RETRY_MS)
    await advance(SLOW_RETRY_MS)

    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(3)
    expect((await service.getStatus()).state).toBe('not_approved')
  })

  // Enabling is the owner asking again, so an earlier disable must not smother the new wait
  it('waits again when the owner re-enables after having turned Remote Access off', async () => {
    const { service } = makeService(DISABLED_OPTIONS)
    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.gated())

    await service.disconnect()
    await expect(service.enable('admin-jwt')).rejects.toBeInstanceOf(CloudEnableError)
    await advance(SLOW_RETRY_MS)

    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(2)
  })

  it('does not retry refusals the account cannot wait out', async () => {
    const { service } = makeService(DISABLED_OPTIONS)
    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.slotsExhausted())

    await expect(service.enable('admin-jwt')).rejects.toMatchObject({ status: 409 })
    await advance(SLOW_RETRY_MS)

    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(1)
  })
})

/*
 * What survives a held-open wait. Approval can be days away, and a cloud that hiccups in the middle
 * of it is not an answer — only the cloud actually deciding something ends the wait.
 */
describe('ConnectSDKService held-open enable', () => {
  const DISABLED_OPTIONS = { [OPTIONS.INSTANCE_ID.name]: 'instance-1234' }

  beforeEach(() => {
    mockedFetchAuthAPI.mockReset()
  })

  // Starts a wait and returns the harness with the gate refusal already delivered
  async function waiting() {
    const harness = makeService(DISABLED_OPTIONS)
    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.gated())
    await expect(harness.service.enable('admin-jwt')).rejects.toBeInstanceOf(CloudEnableError)
    return harness
  }

  it.each([
    ['a server error', () => cloudResponses.serverError()],
    ['a rate limit', () => cloudResponses.rateLimited()],
  ])('keeps waiting through %s', async (_label, response) => {
    const { service, settings } = await waiting()

    mockedFetchAuthAPI.mockResolvedValue(response())
    await advance(SLOW_RETRY_MS)
    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(2)

    // The wait is still live: an approval that lands next time still takes effect
    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.minted('approved-token'))
    await advance(SLOW_RETRY_MS)

    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(3)
    expect(settings.values[ENABLE_REMOTE_ACCESS]).toBe(true)
    expect((await service.getStatus()).state).not.toBe('not_approved')
  })

  it('keeps waiting when the cloud cannot be reached at all', async () => {
    await waiting()

    mockedFetchAuthAPI.mockRejectedValue(new Error('fetch failed'))
    await advance(SLOW_RETRY_MS)

    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.gated())
    await advance(SLOW_RETRY_MS)

    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(3)
  })

  /* The admin's cloud JWT is what the wait is spending, and it does not last forever. Once it is no
     longer accepted there is nothing left to retry with, so the wait ends and the owner decides. */
  it('stops waiting once the admin cloud token is no longer accepted', async () => {
    const { service, settings } = await waiting()

    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.expiredJwt())
    await advance(SLOW_RETRY_MS)
    await advance(SLOW_RETRY_MS)

    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(2)
    expect((await service.getStatus()).state).toBe('not_approved')
    // Nothing is waiting any more, so the toggle must not go on claiming otherwise
    expect(settings.values[ENABLE_REMOTE_ACCESS]).toBe(false)
  })

  it('stops waiting on a refusal that is not the access gate', async () => {
    await waiting()

    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.suspended())
    await advance(SLOW_RETRY_MS)
    await advance(SLOW_RETRY_MS)

    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(2)
  })

  it('stops waiting when every server slot is taken', async () => {
    await waiting()

    mockedFetchAuthAPI.mockResolvedValue(cloudResponses.slotsExhausted())
    await advance(SLOW_RETRY_MS)
    await advance(SLOW_RETRY_MS)

    expect(mockedFetchAuthAPI).toHaveBeenCalledTimes(2)
  })
})

describe('the advertised public port', () => {
  afterEach(() => {
    delete process.env.CONNECT_HTTPS_PORT
    delete process.env.CARDINAL_HOME_SERVER_PORT
  })

  // Registers and returns the register message the server would have received
  async function register(dbOptions: Record<string, string>) {
    const { service, sockets } = makeService({ ...ENABLED_OPTIONS, ...dbOptions })

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()

    return sockets[0].sentMessages().find((m) => m.type === 'register')
  }

  it('is the pinned port when nothing is mapped', async () => {
    process.env.CONNECT_HTTPS_PORT = '8443'

    expect((await register({}))!.publicPort).toBe(8443)
  })

  // The router's mapping is the only source that knows the port the outside world can reach
  it('prefers a mapped port over the pinned port', async () => {
    process.env.CONNECT_HTTPS_PORT = '8443'

    const message = await register({ [OPTIONS.CONNECT_PUBLIC_PORT.name]: '24901' })

    expect(message!.publicPort).toBe(24901)
  })

  it('is the mapped port while UPnP is on', async () => {
    process.env.CONNECT_HTTPS_PORT = '8443'

    const message = await register({
      [OPTIONS.PORT_MAPPING_ENABLED.name]: 'true',
      [OPTIONS.CONNECT_PUBLIC_PORT.name]: '24901',
    })

    expect(message!.publicPort).toBe(24901)
  })

  it('is the mapped port when nothing is pinned', async () => {
    const message = await register({ [OPTIONS.CONNECT_PUBLIC_PORT.name]: '24901' })

    expect(message!.publicPort).toBe(24901)
  })

  /* The quick start publishes the main port 1:1 and the main port answers TLS, so a server nobody
     configured is reachable on exactly the port it already listens on. */
  it('is the main server port when nothing is pinned or mapped', async () => {
    process.env.CARDINAL_HOME_SERVER_PORT = '24900'

    expect((await register({}))!.publicPort).toBe(24900)
  })

  it('is ignored when the pinned value is unusable', async () => {
    process.env.CONNECT_HTTPS_PORT = 'not-a-port'

    const message = await register({ [OPTIONS.CONNECT_PUBLIC_PORT.name]: '24901' })

    expect(message!.publicPort).toBe(24901)
  })
})

describe('ConnectSDKService connection URLs', () => {
  it('has no URLs before a hostname is assigned', async () => {
    const { service } = makeService({ [OPTIONS.CONNECT_ENABLED.name]: 'true' })

    const status = await service.getStatus()

    expect(status.directUrl).toBeNull()
    expect(status.relayUrl).toBeNull()
  })

  it('builds the direct URL from the assigned hostname and the advertised port', async () => {
    const { service } = makeService({
      ...ENABLED_OPTIONS,
      [OPTIONS.CONNECT_HOSTNAME.name]: 'instance-1234.connect.cardinalapps.host',
      [OPTIONS.CONNECT_PUBLIC_PORT.name]: '31000',
    })

    const status = await service.getStatus()

    expect(status.directUrl).toBe('https://instance-1234.connect.cardinalapps.host:31000')
    expect(status.publicPort).toBe(31000)
  })

  it('builds the direct URL from the pinned port', async () => {
    process.env.CONNECT_HTTPS_PORT = '8443'
    const { service } = makeService({
      ...ENABLED_OPTIONS,
      [OPTIONS.CONNECT_HOSTNAME.name]: 'instance-1234.connect.cardinalapps.host',
    })

    const status = await service.getStatus()
    delete process.env.CONNECT_HTTPS_PORT

    expect(status.publicPort).toBe(8443)
    expect(status.directUrl).toBe('https://instance-1234.connect.cardinalapps.host:8443')
  })

  it('omits the port from the direct URL when it is 443', async () => {
    const { service } = makeService({
      ...ENABLED_OPTIONS,
      [OPTIONS.CONNECT_HOSTNAME.name]: 'media.example.com',
      [OPTIONS.CONNECT_PUBLIC_PORT.name]: '443',
    })

    expect((await service.getStatus()).directUrl).toBe('https://media.example.com')
  })

  it('prefers the vanity hostname over the assigned one', async () => {
    const { service } = makeService({
      ...ENABLED_OPTIONS,
      [OPTIONS.CONNECT_HOSTNAME.name]: 'instance-1234.connect.cardinalapps.host',
      [OPTIONS.CONNECT_VANITY_HOSTNAME.name]: 'brians-server.connect.cardinalapps.host',
      [OPTIONS.CONNECT_PUBLIC_PORT.name]: '31000',
    })

    const status = await service.getStatus()

    expect(status.directUrl).toBe('https://brians-server.connect.cardinalapps.host:31000')
    // The assigned name stays reported — it is still on the certificate, and support asks for it
    expect(status.hostname).toBe('instance-1234.connect.cardinalapps.host')
    expect(status.vanityHostname).toBe('brians-server.connect.cardinalapps.host')
  })

  // The two preferences are independent, so a server with both gets the shortest URL it can honestly offer
  it('combines the vanity hostname with a verified port that drops', async () => {
    const { service } = makeService({
      ...ENABLED_OPTIONS,
      [OPTIONS.CONNECT_HOSTNAME.name]: 'instance-1234.connect.cardinalapps.host',
      [OPTIONS.CONNECT_VANITY_HOSTNAME.name]: 'brians-server.connect.cardinalapps.host',
      [OPTIONS.CONNECT_PUBLIC_PORT.name]: '31000',
      [OPTIONS.CONNECT_VERIFIED_EXTERNAL_PORT.name]: '443',
    })

    expect((await service.getStatus()).directUrl).toBe('https://brians-server.connect.cardinalapps.host')
  })

  it('falls back to the assigned hostname once the vanity name is retracted', async () => {
    const { service } = makeService({
      ...ENABLED_OPTIONS,
      [OPTIONS.CONNECT_HOSTNAME.name]: 'instance-1234.connect.cardinalapps.host',
      [OPTIONS.CONNECT_VANITY_HOSTNAME.name]: '',
      [OPTIONS.CONNECT_PUBLIC_PORT.name]: '443',
    })

    const status = await service.getStatus()

    expect(status.directUrl).toBe('https://instance-1234.connect.cardinalapps.host')
    expect(status.vanityHostname).toBeNull()
  })

  // The relay is reached on a shared host with the instance in the path, unlike direct
  it('builds the relay URL from the instance ID', async () => {
    const { service } = makeService()

    expect((await service.getStatus()).relayUrl).toBe('https://relay.cardinalapps.host/relay/instance-1234')
  })

  /* The built-in host is the production one, which is wrong on a self-contained stack. The
     Remote Access Server knows where its own relay answers, so its answer wins. */
  it('prefers the relay hostname the Remote Access Server advertises', async () => {
    const { service, sockets } = makeService()

    await service.connect()
    await flush()
    sockets[0].open()
    await flush()
    sockets[0].receive({
      type: 'registered',
      publicIp: '203.0.113.7',
      hostname: 'h',
      signingKey: 'a2V5',
      config: { relayHostname: 'relay.test.internal' },
    })
    await flush()

    expect((await service.getStatus()).relayUrl).toBe('https://relay.test.internal/relay/instance-1234')
  })

  it('keeps the advertised relay hostname across restarts', async () => {
    const { service } = makeService({ ...ENABLED_OPTIONS, [OPTIONS.CONNECT_RELAY_HOST.name]: 'relay.test.internal' })

    expect((await service.getStatus()).relayUrl).toBe('https://relay.test.internal/relay/instance-1234')
  })

  it('surfaces the HTTPS listener state that the listener published', async () => {
    const { service, httpsStatusStore } = makeService()
    httpsStatusStore.set({ state: 'running', port: 31000, certExpiresAt: null, lastError: null })

    expect((await service.getStatus()).https.state).toBe('running')
    expect((await service.getStatus()).https.port).toBe(31000)
  })
})

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

describe('getLocalIps', () => {
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

describe('resolveLanIps', () => {
  const bridge = { eth0: [v4('172.18.0.2')] }

  beforeEach(() => {
    delete process.env.CONNECT_LAN_IPS
    jest.spyOn(Logger, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    delete process.env.CONNECT_LAN_IPS
    jest.restoreAllMocks()
  })

  it('advertises the configured addresses instead of the ones on the interfaces', () => {
    process.env.CONNECT_LAN_IPS = '192.168.2.232'

    expect(resolveLanIps(undefined, bridge, true)).toEqual(['192.168.2.232'])
  })

  it('accepts a list and drops entries that are not addresses', () => {
    process.env.CONNECT_LAN_IPS = ' 192.168.2.232 ,not-an-ip, 2001:db8::5 '

    expect(resolveLanIps(undefined, bridge, true)).toEqual(['192.168.2.232', '2001:db8::5'])
  })

  it('falls back to the interfaces when the value is empty', () => {
    process.env.CONNECT_LAN_IPS = ''

    expect(resolveLanIps(undefined, { eth0: [v4('192.168.1.40')] }, false)).toEqual(['192.168.1.40'])
  })

  it('advertises no LAN address at all inside an unconfigured bridged container', () => {
    expect(resolveLanIps(undefined, bridge, true)).toEqual([])
  })

  it('keeps the addresses a bridged container really can be reached on', () => {
    const interfaces = { eth0: [v4('172.18.0.2'), v6('2001:db8::5')] }

    expect(resolveLanIps(undefined, interfaces, true)).toEqual(['2001:db8::5'])
  })

  it('leaves a host that legitimately uses 172.16/12 alone', () => {
    expect(resolveLanIps(undefined, { eth0: [v4('172.20.5.5')] }, false)).toEqual(['172.20.5.5'])
  })

  // A fresh registry, because the guard that makes this a startup notice and not a per-register one
  // is module state that the tests above have already spent
  it('says something about the bridged container once, not on every register', async () => {
    jest.resetModules()
    const freshLogger = (await import('@nestjs/common')).Logger
    const warn = jest.spyOn(freshLogger, 'warn').mockImplementation(() => undefined)
    const { resolveLanIps: isolated } = await import('./connect-sdk.service')

    isolated(undefined, bridge, true)
    isolated(undefined, bridge, true)

    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('ConnectSDKService vanity proxy', () => {
  // The Remote Access Server's answers, as the raw Response the proxy reads
  function cloudAnswer(status: number, body: unknown) {
    return { status, json: async () => body }
  }

  function lastCall() {
    const calls = mockedFetchRemoteAccessAPI.mock.calls
    const [endpoint, method, env, options] = calls[calls.length - 1]
    return { endpoint, method, env, options }
  }

  beforeEach(() => {
    mockedFetchRemoteAccessAPI.mockReset()
  })

  it('asks the owner API about a name with this server\'s bearer token', async () => {
    const { service } = makeService()
    mockedFetchRemoteAccessAPI.mockResolvedValue(cloudAnswer(200, { name: 'brianflix', available: true }))

    const result = await service.getVanityAvailability('BrianFlix')

    expect(lastCall().endpoint).toBe('/vanity/availability?name=BrianFlix')
    expect(lastCall().method).toBe('GET')
    expect(lastCall().options.headers.Authorization).toBe('Bearer access-jwt')
    expect(lastCall().options.returnRawResponse).toBe(true)
    expect(result).toEqual({ status: 200, body: { name: 'brianflix', available: true } })
  })

  it('reads and writes the names under this server\'s own instance ID', async () => {
    const { service } = makeService()
    mockedFetchRemoteAccessAPI.mockResolvedValue(cloudAnswer(200, { labels: ['brianflix'], primary: 'brianflix', state: 'live' }))

    await service.getVanity()
    expect(lastCall().endpoint).toBe('/servers/instance-1234/vanity')
    expect(lastCall().method).toBe('GET')

    await service.setVanity('brianflix')
    expect(lastCall().endpoint).toBe('/servers/instance-1234/vanity')
    expect(lastCall().method).toBe('PUT')
    expect(lastCall().options.body).toEqual({ name: 'brianflix' })

    await service.releaseVanity('brian flix')
    expect(lastCall().endpoint).toBe('/servers/instance-1234/vanity?name=brian%20flix')
    expect(lastCall().method).toBe('DELETE')
  })

  const refusals: { status: number, body: Record<string, unknown> }[] = [
    { status: 422, body: { error: 'invalid_name' } },
    { status: 409, body: { error: 'name_unavailable' } },
    { status: 409, body: { error: 'label_limit_reached', limit: 1 } },
    { status: 429, body: { error: 'rename_cooldown', retryAfterSeconds: 86400 } },
    { status: 402, body: { error: 'cert_unavailable', labels: ['brianflix'], primary: 'brianflix', state: 'pending' } },
    { status: 503, body: { error: 'vanity_disabled' } },
    { status: 404, body: { error: 'not_found' } },
  ]

  it.each(refusals)('hands back a $status refusal exactly as the owner API gave it', async ({ status, body }) => {
    const { service } = makeService()
    mockedFetchRemoteAccessAPI.mockResolvedValue(cloudAnswer(status, body))

    expect(await service.setVanity('brianflix')).toEqual({ status, body })
  })

  it('does not call the owner API when Remote Access is off', async () => {
    const { service } = makeService({ ...ENABLED_OPTIONS, [OPTIONS.CONNECT_ENABLED.name]: 'false' })

    await expect(service.getVanity()).rejects.toBeInstanceOf(VanityUnavailableError)
    expect(mockedFetchRemoteAccessAPI).not.toHaveBeenCalled()
  })

  it('does not call the owner API when no server token is stored', async () => {
    const { service } = makeService({
      [OPTIONS.CONNECT_ENABLED.name]: 'true',
      [OPTIONS.INSTANCE_ID.name]: 'instance-1234',
    })

    await expect(service.setVanity('brianflix')).rejects.toBeInstanceOf(VanityUnavailableError)
    expect(mockedFetchRemoteAccessAPI).not.toHaveBeenCalled()
  })

  it('does not call the owner API when the stored credential has been rejected', async () => {
    const { service, refresher } = makeService()
    refresher.getCurrentToken.mockRejectedValue(new ConnectAuthError('The Remote Access server token was rejected.'))

    await expect(service.getVanityAvailability('brianflix')).rejects.toBeInstanceOf(VanityUnavailableError)
    expect(mockedFetchRemoteAccessAPI).not.toHaveBeenCalled()
  })

  it('does not call the owner API before this server has an instance ID', async () => {
    const { service } = makeService({
      [OPTIONS.CONNECT_ENABLED.name]: 'true',
      [OPTIONS.CONNECT_SERVER_TOKEN.name]: 'server-token',
    })

    await expect(service.getVanity()).rejects.toBeInstanceOf(VanityUnavailableError)
    expect(mockedFetchRemoteAccessAPI).not.toHaveBeenCalled()
  })
})
