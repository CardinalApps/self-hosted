/* eslint-disable turbo/no-undeclared-env-vars -- tests pin the listener port through the real env var */
import * as fs from 'fs'
import * as path from 'path'
import { EventEmitter } from 'node:events'

import { HttpsService } from './https.service'
import { ConnectSDKEvents } from '../connect/connect-sdk.events'
import { HttpsStatusStore } from '../connect/https-status.store'
import { ConnectSDKService } from '../connect/connect-sdk.service'
import { DatabaseService } from '../../database/database.service'
import { MuxService } from '../mux/mux.service'
import { PortMapperService } from '../port-mapper/port-mapper.service'
import { OPTIONS } from '../../../utils/options'

// The port the mux bound, which is the server's main port
const MAIN_PORT = 24900

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

function makeService(initialOptions: Record<string, string> = {}, directEnabled = true) {
  const db = makeDb(initialOptions)
  const connectSDKService = { isPathEnabled: jest.fn(async () => directEnabled) }
  const events = new ConnectSDKEvents()
  const portMapper = { mapIfEnabled: jest.fn(async () => ({ state: 'disabled' })) }
  const mux = { setTlsServer: jest.fn(), getPort: jest.fn(() => MAIN_PORT as number | null) }
  const servers: FakeHttpsServer[] = []
  const factory = jest.fn(() => {
    const server = new FakeHttpsServer()
    servers.push(server)
    return server as never
  })

  const statusStore = new HttpsStatusStore()
  const service = new HttpsService(
    db as unknown as DatabaseService,
    events,
    statusStore,
    connectSDKService as unknown as ConnectSDKService,
    portMapper as unknown as PortMapperService,
    mux as unknown as MuxService,
    factory,
  )
  service.onApplicationBootstrap()

  const listener = jest.fn()
  return { service, db, events, portMapper, mux, factory, servers, listener, statusStore, connectSDKService }
}

// Lets the void promise chains kicked off by event handlers settle
async function flush(passes = 10) {
  for (let i = 0; i < passes; i++) {
    await Promise.resolve()
  }
}

describe('startup', () => {
  it('serves TLS on the main port with enabled + stored cert material', async () => {
    const { service, factory, servers, mux, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ cert: CERT_A, key: KEY_A }), listener)
    expect(mux.setTlsServer).toHaveBeenCalledWith(servers[0])
    expect(service.getStatus()).toMatchObject({ state: 'running', port: MAIN_PORT })
    expect(service.getStatus().certExpiresAt).not.toBeNull()
  })

  // A port of its own is what the legacy pin buys, and nothing else asks for one
  it('binds no port of its own', async () => {
    const { service, servers, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    expect(servers[0].listenedPort).toBeNull()
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

  // The main port answers TLS either way, so a pinned listener is an addition, not a replacement
  it('also serves TLS on the main port when a port is pinned', async () => {
    const { service, servers, mux, listener } = makeService({
      ...ENABLED_WITH_CERT,
      [OPTIONS.CONNECT_HTTPS_PORT.name]: '31234',
    })

    service.attach(listener)
    await flush()

    expect(mux.setTlsServer).toHaveBeenCalledWith(servers[0])
  })

  it('does not start when Remote Access is disabled', async () => {
    const { service, factory, mux, listener } = makeService({
      [OPTIONS.CONNECT_TLS_CERT_PEM.name]: CERT_A,
      [OPTIONS.CONNECT_TLS_KEY_PEM.name]: KEY_A,
    })

    service.attach(listener)
    await flush()

    expect(factory).not.toHaveBeenCalled()
    expect(mux.setTlsServer).not.toHaveBeenCalled()
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

/* Pinning is what a deployment does when its external TLS port has to differ from the main port.
   The main port serves TLS regardless, so the pinned listener is a second front door. */
describe('the legacy pinned port env var', () => {
  afterEach(() => {
    delete process.env.CONNECT_HTTPS_PORT
  })

  it('binds the port the deployment pinned', async () => {
    process.env.CONNECT_HTTPS_PORT = '8443'
    const { service, servers, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    expect(servers[0].listenedPort).toBe(8443)
    expect(service.getStatus()).toMatchObject({ state: 'running', port: 8443 })
  })

  it('outranks the stored option', async () => {
    process.env.CONNECT_HTTPS_PORT = '8443'
    const { service, servers, listener } = makeService({
      ...ENABLED_WITH_CERT,
      [OPTIONS.CONNECT_HTTPS_PORT.name]: '31234',
    })

    service.attach(listener)
    await flush()

    expect(servers[0].listenedPort).toBe(8443)
  })

  it('is the desired external port for the port mapper', async () => {
    process.env.CONNECT_HTTPS_PORT = '8443'
    const { service, portMapper, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    expect(portMapper.mapIfEnabled).toHaveBeenCalledWith(8443, 8443)
  })

  it('leaves TLS on the main port alone when the value is unusable', async () => {
    process.env.CONNECT_HTTPS_PORT = 'not-a-port'
    const { service, servers, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    expect(servers[0].listenedPort).toBeNull()
    expect(service.getStatus()).toMatchObject({ state: 'running', port: MAIN_PORT })
  })
})

describe('port mapping trigger', () => {
  /* The mapping points at the main port now that it is the one serving TLS. The external port
     stays random, so a Cardinal server is not sitting on a well-known port on the public internet. */
  it('maps the main port with a random desired external port when no port is pinned', async () => {
    const { service, portMapper, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    expect(portMapper.mapIfEnabled).toHaveBeenCalledTimes(1)
    const [internalPort, desiredExternalPort] = portMapper.mapIfEnabled.mock.calls[0] as unknown as [number, number]
    expect(internalPort).toBe(MAIN_PORT)
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

  it('does not map anything before the main port is bound', async () => {
    const { service, portMapper, mux, listener } = makeService(ENABLED_WITH_CERT)
    mux.getPort.mockReturnValue(null)

    service.attach(listener)
    await flush()

    expect(portMapper.mapIfEnabled).not.toHaveBeenCalled()
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
    const { service, events, servers, mux, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()
    expect(service.getStatus().state).toBe('running')

    events.emit('enabled:changed', false)
    await flush()

    expect(servers[0].closed).toBe(true)
    expect(servers[0].closeIdleConnections).toHaveBeenCalled()
    expect(mux.setTlsServer).toHaveBeenLastCalledWith(null)
    expect(service.getStatus().state).toBe('stopped')
  })

  // The main port keeps serving HTTP either way; only its TLS half goes away
  it('takes TLS off the main port when it stops', async () => {
    const { service, mux, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()
    await service.stop()

    expect(mux.setTlsServer).toHaveBeenLastCalledWith(null)
  })

  it('closes on application shutdown', async () => {
    const { service, servers, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    await service.onApplicationShutdown()

    expect(servers[0].closed).toBe(true)
  })
})

describe('the direct path toggle', () => {
  it('starts when the direct path has never been written', async () => {
    const { service, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    expect(service.getStatus().state).toBe('running')
  })

  it('does not start while the direct path is off', async () => {
    const { service, factory, listener } = makeService(ENABLED_WITH_CERT, false)

    service.attach(listener)
    await flush()

    expect(factory).not.toHaveBeenCalled()
    expect(service.getStatus().state).toBe('stopped')
  })

  it('closes the listener when the direct path is turned off at runtime', async () => {
    const { service, events, servers, mux, listener } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()
    expect(service.getStatus().state).toBe('running')

    events.emit('direct:changed', false)
    await flush()

    expect(servers[0].closed).toBe(true)
    expect(mux.setTlsServer).toHaveBeenLastCalledWith(null)
    expect(service.getStatus().state).toBe('stopped')
  })

  it('starts the listener when the direct path is turned back on', async () => {
    const { service, events, listener, connectSDKService } = makeService(ENABLED_WITH_CERT, false)

    service.attach(listener)
    await flush()
    expect(service.getStatus().state).toBe('stopped')

    connectSDKService.isPathEnabled.mockResolvedValue(true)
    events.emit('direct:changed', true)
    await flush()

    expect(service.getStatus().state).toBe('running')
  })
})

describe('status publishing', () => {
  it('publishes the running listener so the status endpoint can report it', async () => {
    const { service, listener, statusStore } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()

    expect(statusStore.get()).toMatchObject({ state: 'running' })
    expect(statusStore.get().port).toBe(service.getStatus().port)
    expect(statusStore.get().certExpiresAt).not.toBeNull()
  })

  it('publishes the stopped state after a shutdown', async () => {
    const { service, listener, statusStore } = makeService(ENABLED_WITH_CERT)

    service.attach(listener)
    await flush()
    await service.stop()

    expect(statusStore.get()).toMatchObject({ state: 'stopped', port: null })
  })

  it('publishes the error when stored cert material is unusable', async () => {
    const { service, listener, statusStore } = makeService({
      [OPTIONS.CONNECT_ENABLED.name]: 'true',
      [OPTIONS.CONNECT_TLS_CERT_PEM.name]: 'not-a-cert',
      [OPTIONS.CONNECT_TLS_KEY_PEM.name]: 'not-a-key',
    })

    service.attach(listener)
    await flush()

    expect(statusStore.get().state).toBe('error')
    expect(statusStore.get().lastError).toContain('Rejected invalid TLS certificate material')
  })
})
