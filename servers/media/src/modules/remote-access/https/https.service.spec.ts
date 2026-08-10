import * as fs from 'fs'
import * as path from 'path'
import { EventEmitter } from 'node:events'

import { HttpsService } from './https.service'
import { ConnectSDKEvents } from '../connect/connect-sdk.events'
import { DatabaseService } from '../../database/database.service'
import { PortMapperService } from '../port-mapper/port-mapper.service'
import { OPTIONS } from '../../../utils/options'

const FIXTURES = path.join(__dirname, '..', '..', '..', '..', 'tests', 'fixtures', 'certs')
const CERT_A = fs.readFileSync(path.join(FIXTURES, 'cert-a.pem'), 'utf8')
const KEY_A = fs.readFileSync(path.join(FIXTURES, 'key-a.pem'), 'utf8')
const CERT_B = fs.readFileSync(path.join(FIXTURES, 'cert-b.pem'), 'utf8')
const KEY_B = fs.readFileSync(path.join(FIXTURES, 'key-b.pem'), 'utf8')

class FakeHttpsServer extends EventEmitter {
  listenedPort: number | null = null
  boundPort: number | null = null
  closed = false
  setSecureContext = jest.fn()
  closeIdleConnections = jest.fn()

  listen(port: number, callback: () => void) {
    this.listenedPort = port
    // Port 0 gets an OS-assigned port, like the real server
    this.boundPort = port === 0 ? 45678 : port
    callback()
    return this
  }

  address() {
    return { port: this.boundPort }
  }

  close(callback: () => void) {
    this.closed = true
    callback()
    return this
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

const ENABLED_WITH_CERT = {
  [OPTIONS.CONNECT_ENABLED.name]: 'true',
  [OPTIONS.CONNECT_TLS_CERT_PEM.name]: CERT_A,
  [OPTIONS.CONNECT_TLS_KEY_PEM.name]: KEY_A,
}

function makeService(initialOptions: Record<string, string> = {}) {
  const db = makeDb(initialOptions)
  const events = new ConnectSDKEvents()
  const portMapper = { mapIfEnabled: jest.fn(async () => ({ state: 'disabled' })) }
  const servers: FakeHttpsServer[] = []
  const factory = jest.fn(() => {
    const server = new FakeHttpsServer()
    servers.push(server)
    return server as never
  })

  const service = new HttpsService(
    db as unknown as DatabaseService,
    events,
    portMapper as unknown as PortMapperService,
    factory,
  )
  service.onApplicationBootstrap()

  const listener = jest.fn()
  return { service, db, events, portMapper, factory, servers, listener }
}

// Lets the void promise chains kicked off by event handlers settle
async function flush(passes = 10) {
  for (let i = 0; i < passes; i++) {
    await Promise.resolve()
  }
}

describe('startup', () => {
  it('starts on attach with enabled + stored cert material', async () => {
    const { service, factory, servers, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ cert: CERT_A, key: KEY_A }), listener)
    expect(servers[0].listenedPort).toBe(0)
    expect(service.getStatus()).toMatchObject({ state: 'running', port: 45678 })
    expect(service.getStatus().certExpiresAt).not.toBeNull()
  })

  it('binds the pinned port when connect_https_port is set', async () => {
    const { service, servers, listener } = makeService({
      ...ENABLED_WITH_CERT,
      [OPTIONS.CONNECT_HTTPS_PORT.name]: '31234',
    })

    service.attach(listener)
    await flush()

    expect(servers[0].listenedPort).toBe(31234)
    expect(service.getStatus()).toMatchObject({ state: 'running', port: 31234 })
  })

  it('does not start when Remote Access is disabled', async () => {
    const { service, factory, listener } = makeService({
      [OPTIONS.CONNECT_TLS_CERT_PEM.name]: CERT_A,
      [OPTIONS.CONNECT_TLS_KEY_PEM.name]: KEY_A,
    })

    service.attach(listener)
    await flush()

    expect(factory).not.toHaveBeenCalled()
    expect(service.getStatus().state).toBe('stopped')
  })

  it('does not start when only one of cert or key is stored', async () => {
    const { service, factory, listener } = makeService({
      [OPTIONS.CONNECT_ENABLED.name]: 'true',
      [OPTIONS.CONNECT_TLS_CERT_PEM.name]: CERT_A,
    })

    service.attach(listener)
    await flush()

    expect(factory).not.toHaveBeenCalled()
    expect(service.getStatus().state).toBe('stopped')
  })

  it('reports an error state for invalid stored material', async () => {
    const { service, factory, listener } = makeService({
      [OPTIONS.CONNECT_ENABLED.name]: 'true',
      [OPTIONS.CONNECT_TLS_CERT_PEM.name]: 'not a pem',
      [OPTIONS.CONNECT_TLS_KEY_PEM.name]: 'not a key',
    })

    service.attach(listener)
    await flush()

    expect(factory).not.toHaveBeenCalled()
    expect(service.getStatus().state).toBe('error')
    expect(service.getStatus().lastError).toContain('Rejected invalid TLS certificate material')
  })
})

describe('port mapping trigger', () => {
  it('maps the bound port with a random desired external port when no port is pinned', async () => {
    const { service, portMapper, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    expect(portMapper.mapIfEnabled).toHaveBeenCalledTimes(1)
    const [internalPort, desiredExternalPort] = portMapper.mapIfEnabled.mock.calls[0] as unknown as [number, number]
    expect(internalPort).toBe(45678)
    expect(desiredExternalPort).toBeGreaterThanOrEqual(20000)
    expect(desiredExternalPort).toBeLessThan(60000)
  })

  it('maps the pinned port as both internal and desired external', async () => {
    const { service, portMapper, listener } = makeService({
      ...ENABLED_WITH_CERT,
      [OPTIONS.CONNECT_HTTPS_PORT.name]: '31234',
    })

    service.attach(listener)
    await flush()

    expect(portMapper.mapIfEnabled).toHaveBeenCalledWith(31234, 31234)
  })
})

describe('cert hot-reload', () => {
  it('replaces the secure context on cert:update without restarting', async () => {
    const { service, events, servers, factory, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    events.emit('cert:update', { cert_pem: CERT_B, key_pem: KEY_B })
    await flush()

    expect(servers[0].setSecureContext).toHaveBeenCalledWith({ cert: CERT_B, key: KEY_B })
    expect(factory).toHaveBeenCalledTimes(1)
    expect(service.getStatus().state).toBe('running')
  })

  it('ignores malformed pushed material and keeps the current context', async () => {
    const { service, events, servers, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    events.emit('cert:update', { cert_pem: 'garbage', key_pem: KEY_B })
    await flush()

    expect(servers[0].setSecureContext).not.toHaveBeenCalled()
    expect(service.getStatus().state).toBe('running')
    expect(service.getStatus().lastError).toContain('Rejected invalid TLS certificate material')
  })

  it('starts the listener when the first cert arrives after registration', async () => {
    const { service, db, events, factory, listener } = makeService({
      [OPTIONS.CONNECT_ENABLED.name]: 'true',
    })

    service.attach(listener)
    await flush()
    expect(factory).not.toHaveBeenCalled()

    // The ConnectSDK persists the pushed material before emitting
    db.options[OPTIONS.CONNECT_TLS_CERT_PEM.name] = CERT_A
    db.options[OPTIONS.CONNECT_TLS_KEY_PEM.name] = KEY_A
    events.emit('cert:update', { cert_pem: CERT_A, key_pem: KEY_A })
    await flush()

    expect(factory).toHaveBeenCalledTimes(1)
    expect(service.getStatus().state).toBe('running')
  })
})

describe('runtime enable and disable', () => {
  it('starts when Remote Access is enabled mid-runtime', async () => {
    const { service, db, events, factory, listener } = makeService({
      [OPTIONS.CONNECT_TLS_CERT_PEM.name]: CERT_A,
      [OPTIONS.CONNECT_TLS_KEY_PEM.name]: KEY_A,
    })

    service.attach(listener)
    await flush()
    expect(factory).not.toHaveBeenCalled()

    db.options[OPTIONS.CONNECT_ENABLED.name] = 'true'
    events.emit('enabled:changed', true)
    await flush()

    expect(service.getStatus().state).toBe('running')
  })

  it('closes gracefully when Remote Access is disabled', async () => {
    const { service, events, servers, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()
    expect(service.getStatus().state).toBe('running')

    events.emit('enabled:changed', false)
    await flush()

    expect(servers[0].closed).toBe(true)
    expect(servers[0].closeIdleConnections).toHaveBeenCalled()
    expect(service.getStatus().state).toBe('stopped')
  })

  it('closes on application shutdown', async () => {
    const { service, servers, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    await service.onApplicationShutdown()

    expect(servers[0].closed).toBe(true)
  })
})
