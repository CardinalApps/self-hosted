import * as net from 'net'
import { PassThrough } from 'stream'

import { PEEK_TIMEOUT_MS, TLS_HANDSHAKE_FIRST_BYTE, routeSocket } from './protocol-mux'

// A duplex stands in for the accepted socket: routing only uses stream reads,
// unshift, and destroy
function makeSocket(): net.Socket {
  return new PassThrough() as unknown as net.Socket
}

function makeHandlers(withTls = true) {
  const onTls = jest.fn()
  const onPlain = jest.fn()

  return { onTls: withTls ? onTls : null, onPlain, tlsCalls: onTls }
}

/* Reads the routed socket back out the way the half that receives it would: only once it has been
   handed over. The byte that was put back arrives as a chunk of its own, so the read is complete
   only when every byte the client sent has come through. */
function drain(socket: net.Socket, expectedBytes: number): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    socket.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
      const received = Buffer.concat(chunks)
      if (received.length >= expectedBytes) {
        resolve(received)
      }
    })
  })
}

const settle = () => new Promise((resolve) => setImmediate(resolve))

describe('the routing table', () => {
  it('sends a TLS handshake to the TLS half', async () => {
    const socket = makeSocket()
    const handlers = makeHandlers()

    routeSocket(socket, handlers)
    socket.write(Buffer.from([TLS_HANDSHAKE_FIRST_BYTE, 0x03, 0x01]))
    await settle()

    expect(handlers.tlsCalls).toHaveBeenCalledWith(socket)
    expect(handlers.onPlain).not.toHaveBeenCalled()
    expect(socket.destroyed).toBe(false)
  })

  it('sends an HTTP request to the plain half', async () => {
    const socket = makeSocket()
    const handlers = makeHandlers()

    routeSocket(socket, handlers)
    socket.write('GET /api/v1/health HTTP/1.1\r\n\r\n')
    await settle()

    expect(handlers.onPlain).toHaveBeenCalledWith(socket)
    expect(handlers.tlsCalls).not.toHaveBeenCalled()
  })

  // Only a handshake is worth diverting; the HTTP parser can reject the rest itself
  it.each([
    ['a null byte', 0x00],
    ['a high byte', 0xff],
    ['another TLS record type', 0x17],
  ])('sends %s to the plain half', async (_label, byte) => {
    const socket = makeSocket()
    const handlers = makeHandlers()

    routeSocket(socket, handlers)
    socket.write(Buffer.from([byte, 0x01, 0x02]))
    await settle()

    expect(handlers.onPlain).toHaveBeenCalledWith(socket)
    expect(handlers.tlsCalls).not.toHaveBeenCalled()
  })

  it('closes a TLS handshake while the TLS half is inactive', async () => {
    const socket = makeSocket()
    const handlers = makeHandlers(false)

    routeSocket(socket, handlers)
    socket.write(Buffer.from([TLS_HANDSHAKE_FIRST_BYTE, 0x03, 0x01]))
    await settle()

    expect(handlers.onPlain).not.toHaveBeenCalled()
    expect(socket.destroyed).toBe(true)
  })
})

describe('the peeked byte', () => {
  it('is still there for the half that gets the socket', async () => {
    const socket = makeSocket()
    const request = 'GET /api/v1/health HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n'
    const handlers = makeHandlers()

    routeSocket(socket, handlers)
    socket.write(request)
    await settle()

    const received = await drain(socket, request.length)
    expect(received.toString()).toBe(request)
    expect(handlers.onPlain).toHaveBeenCalled()
  })

  it('is still there for the TLS half', async () => {
    const socket = makeSocket()
    const clientHello = Buffer.from([TLS_HANDSHAKE_FIRST_BYTE, 0x03, 0x01, 0x00, 0x2f])
    const handlers = makeHandlers()

    routeSocket(socket, handlers)
    socket.write(clientHello)
    await settle()

    const received = await drain(socket, clientHello.length)
    expect(received).toEqual(clientHello)
  })
})

describe('a connection that never speaks', () => {
  it('is closed once the peek times out', async () => {
    const socket = makeSocket()
    const handlers = makeHandlers()

    routeSocket(socket, handlers, 20)
    await new Promise((resolve) => setTimeout(resolve, 60))

    expect(socket.destroyed).toBe(true)
    expect(handlers.onPlain).not.toHaveBeenCalled()
    expect(handlers.tlsCalls).not.toHaveBeenCalled()
  })

  it('gets a generous timeout by default, for slow networks', () => {
    expect(PEEK_TIMEOUT_MS).toBeGreaterThanOrEqual(1000)
  })

  it('stops the timer once it has been routed', async () => {
    const socket = makeSocket()
    const handlers = makeHandlers()

    routeSocket(socket, handlers, 20)
    socket.write('GET / HTTP/1.1\r\n\r\n')
    await new Promise((resolve) => setTimeout(resolve, 60))

    expect(socket.destroyed).toBe(false)
  })

  it('is closed when it hangs up before sending anything', async () => {
    const socket = makeSocket()
    const handlers = makeHandlers()

    routeSocket(socket, handlers)
    socket.end()
    await settle()

    expect(socket.destroyed).toBe(true)
    expect(handlers.onPlain).not.toHaveBeenCalled()
  })

  it('is dropped without routing when it errors first', async () => {
    const socket = makeSocket()
    const handlers = makeHandlers()

    routeSocket(socket, handlers)
    socket.emit('error', new Error('ECONNRESET'))
    await settle()

    expect(handlers.onPlain).not.toHaveBeenCalled()
    expect(handlers.tlsCalls).not.toHaveBeenCalled()
  })
})
