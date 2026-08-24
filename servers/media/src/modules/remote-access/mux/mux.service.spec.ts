import * as http from 'http'
import * as net from 'net'
import * as tls from 'tls'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'stream'

import { MuxService } from './mux.service'
import { TLS_HANDSHAKE_FIRST_BYTE } from './protocol-mux'

class FakeNetServer extends EventEmitter {
  listenedPort: number | null = null
  listenedHost: string | null = null
  closed = false

  constructor(readonly connectionListener: (socket: net.Socket) => void) {
    super()
  }

  listen(port: number, ...args: unknown[]) {
    this.listenedPort = port
    this.listenedHost = typeof args[0] === 'string' ? args[0] : null
    const callback = args.find((arg) => typeof arg === 'function') as (() => void) | undefined
    callback?.()
    return this
  }

  address() {
    return { port: this.listenedPort === 0 ? 41234 : this.listenedPort }
  }

  close(callback: () => void) {
    this.closed = true
    callback()
    return this
  }
}

function makeService() {
  const servers: FakeNetServer[] = []
  const factory = jest.fn((connectionListener: (socket: net.Socket) => void) => {
    const server = new FakeNetServer(connectionListener)
    servers.push(server)
    return server as unknown as net.Server
  })

  const httpServer = new EventEmitter() as unknown as http.Server
  const tlsServer = new EventEmitter() as unknown as tls.Server
  const service = new MuxService(factory)

  return { service, servers, factory, httpServer, tlsServer }
}

// Feeds a connection through the mux and returns the socket the halves see
async function connect(server: FakeNetServer, firstByte: number): Promise<net.Socket> {
  const socket = new PassThrough() as unknown as net.Socket
  server.connectionListener(socket)
  socket.write(Buffer.from([firstByte, 0x01, 0x02]))
  await new Promise((resolve) => setImmediate(resolve))

  return socket
}

describe('binding the main port', () => {
  it('reports the port it bound', async () => {
    const { service, servers, httpServer } = makeService()

    const port = await service.listen(24900, httpServer)

    expect(servers[0].listenedPort).toBe(24900)
    expect(port).toBe(24900)
    expect(service.getPort()).toBe(24900)
  })

  it('reports the OS-assigned port when asked for any port', async () => {
    const { service, httpServer } = makeService()

    expect(await service.listen(0, httpServer)).toBe(41234)
  })

  it('binds the host it is given', async () => {
    const { service, servers, httpServer } = makeService()

    await service.listen(0, httpServer, '127.0.0.1')

    expect(servers[0].listenedHost).toBe('127.0.0.1')
  })

  it('knows no port before it has bound one', () => {
    const { service } = makeService()

    expect(service.getPort()).toBeNull()
  })

  it('closes the listener on shutdown', async () => {
    const { service, servers, httpServer } = makeService()

    await service.listen(0, httpServer)
    await service.onApplicationShutdown()

    expect(servers[0].closed).toBe(true)
  })
})

describe('routing to the halves', () => {
  it('hands a plain connection to the HTTP server', async () => {
    const { service, servers, httpServer } = makeService()
    await service.listen(0, httpServer)
    const onConnection = jest.fn()
    httpServer.on('connection', onConnection)

    const socket = await connect(servers[0], 0x47)

    expect(onConnection).toHaveBeenCalledWith(socket)
  })

  it('closes a TLS connection while the TLS half is inactive', async () => {
    const { service, servers, httpServer } = makeService()
    await service.listen(0, httpServer)
    const onConnection = jest.fn()
    httpServer.on('connection', onConnection)

    const socket = await connect(servers[0], TLS_HANDSHAKE_FIRST_BYTE)

    expect(onConnection).not.toHaveBeenCalled()
    expect(socket.destroyed).toBe(true)
    expect(service.isTlsActive()).toBe(false)
  })

  it('hands a TLS connection to the TLS server once one is registered', async () => {
    const { service, servers, httpServer, tlsServer } = makeService()
    await service.listen(0, httpServer)
    const onConnection = jest.fn()
    tlsServer.on('connection', onConnection)

    service.setTlsServer(tlsServer)
    const socket = await connect(servers[0], TLS_HANDSHAKE_FIRST_BYTE)

    expect(onConnection).toHaveBeenCalledWith(socket)
    expect(service.isTlsActive()).toBe(true)
  })

  it('goes back to closing TLS connections after the TLS server is withdrawn', async () => {
    const { service, servers, httpServer, tlsServer } = makeService()
    await service.listen(0, httpServer)
    const onConnection = jest.fn()
    tlsServer.on('connection', onConnection)

    service.setTlsServer(tlsServer)
    service.setTlsServer(null)
    const socket = await connect(servers[0], TLS_HANDSHAKE_FIRST_BYTE)

    expect(onConnection).not.toHaveBeenCalled()
    expect(socket.destroyed).toBe(true)
    expect(service.isTlsActive()).toBe(false)
  })

  it('keeps serving plain HTTP while the TLS half is active', async () => {
    const { service, servers, httpServer, tlsServer } = makeService()
    await service.listen(0, httpServer)
    const onConnection = jest.fn()
    httpServer.on('connection', onConnection)

    service.setTlsServer(tlsServer)
    const socket = await connect(servers[0], 0x47)

    expect(onConnection).toHaveBeenCalledWith(socket)
  })
})

/* The app only ever registers its WebSocket handling on the HTTP server, so upgrades that arrive
   over TLS have to be handed to it rather than answered by the TLS server on its own. */
describe('WebSocket upgrades over the TLS half', () => {
  it('are handed to the HTTP server', async () => {
    const { service, httpServer, tlsServer } = makeService()
    await service.listen(0, httpServer)
    const onUpgrade = jest.fn()
    httpServer.on('upgrade', onUpgrade)
    service.setTlsServer(tlsServer)

    const socket = new PassThrough() as unknown as net.Socket
    const request = {} as http.IncomingMessage
    tlsServer.emit('upgrade', request, socket, Buffer.alloc(0))

    expect(onUpgrade).toHaveBeenCalledWith(request, socket, Buffer.alloc(0))
  })

  it('are closed when the app is not handling upgrades at all', async () => {
    const { service, httpServer, tlsServer } = makeService()
    await service.listen(0, httpServer)
    service.setTlsServer(tlsServer)

    const socket = new PassThrough() as unknown as net.Socket
    tlsServer.emit('upgrade', {} as http.IncomingMessage, socket, Buffer.alloc(0))

    expect(socket.destroyed).toBe(true)
  })

  it('stop being forwarded after the TLS server is withdrawn', async () => {
    const { service, httpServer, tlsServer } = makeService()
    await service.listen(0, httpServer)
    const onUpgrade = jest.fn()
    httpServer.on('upgrade', onUpgrade)

    service.setTlsServer(tlsServer)
    service.setTlsServer(null)
    tlsServer.emit('upgrade', {} as http.IncomingMessage, new PassThrough(), Buffer.alloc(0))

    expect(onUpgrade).not.toHaveBeenCalled()
  })
})
