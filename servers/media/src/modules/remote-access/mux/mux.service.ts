import * as http from 'http'
import * as net from 'net'
import * as tls from 'tls'
import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common'

import { routeSocket } from './protocol-mux'

// The subset of net used to bind the port; injectable so tests can supply a fake
export type NetServerFactory = (connectionListener: (socket: net.Socket) => void) => net.Server
export const NET_SERVER_FACTORY = 'NET_SERVER_FACTORY'

/**
 * Owns the server's one and only listening port and decides, per connection,
 * whether it is HTTP or TLS. Plain connections go to the app's HTTP server
 * exactly as if it had bound the port itself; TLS connections go to the
 * Remote Access listener, when Remote Access has one to offer. The result is
 * that direct Remote Access needs no port of its own — the port every install
 * already publishes answers both.
 */
@Injectable()
export class MuxService implements OnApplicationShutdown {
  private server: net.Server | null = null
  private httpServer: http.Server | null = null
  private tlsServer: tls.Server | null = null
  private port: number | null = null

  constructor(@Inject(NET_SERVER_FACTORY) private readonly serverFactory: NetServerFactory) {}

  /**
   * Binds the main port and routes everything it accepts. Returns the bound
   * port, which is the given one unless the OS was asked to choose.
   */
  async listen(port: number, httpServer: http.Server, host?: string): Promise<number> {
    this.httpServer = httpServer

    const server = this.serverFactory((socket) => this.route(socket))

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      const onListening = () => {
        server.off('error', reject)
        resolve()
      }

      if (host) {
        server.listen(port, host, onListening)
      } else {
        server.listen(port, onListening)
      }
    })

    server.on('error', (error) => Logger.error(`Listener error: ${error}`, 'Mux'))

    this.server = server
    this.port = (server.address() as net.AddressInfo).port

    return this.port
  }

  /**
   * The port the server is reachable on, or null before it has bound one.
   */
  getPort(): number | null {
    return this.port
  }

  /**
   * Registers the server that answers TLS connections, or clears it with
   * null. Until one is registered, TLS connections are closed on arrival.
   */
  setTlsServer(server: tls.Server | null): void {
    this.tlsServer?.off('upgrade', this.forwardUpgrade)
    this.tlsServer = server
    server?.on('upgrade', this.forwardUpgrade)
  }

  /**
   * Whether TLS connections are currently being answered.
   */
  isTlsActive(): boolean {
    return this.tlsServer !== null
  }

  /**
   * Stops accepting connections. Established ones are left to finish.
   */
  async onApplicationShutdown(): Promise<void> {
    const server = this.server
    this.server = null
    this.port = null

    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  }

  // Sends one accepted connection to whichever half speaks its protocol
  private route(socket: net.Socket): void {
    routeSocket(socket, {
      onTls: this.tlsServer ? this.dispatchTls : null,
      onPlain: this.dispatchPlain,
    })
  }

  // Hands the socket to Nest's HTTP server as if it had accepted it itself
  private dispatchPlain = (socket: net.Socket): void => {
    if (!this.httpServer) {
      socket.destroy()
      return
    }

    this.httpServer.emit('connection', socket)
  }

  // Hands the socket to the Remote Access TLS server, which does the handshake
  private dispatchTls = (socket: net.Socket): void => {
    if (!this.tlsServer) {
      socket.destroy()
      return
    }

    this.tlsServer.emit('connection', socket)
  }

  /* WebSocket handling is registered on the app's HTTP server, so an upgrade that arrives over TLS
     has to be handed there; the TLS server has no handler of its own and would drop it. */
  private forwardUpgrade = (request: http.IncomingMessage, socket: net.Socket, head: Buffer): void => {
    if (!this.httpServer?.listenerCount('upgrade')) {
      socket.destroy()
      return
    }

    this.httpServer.emit('upgrade', request, socket, head)
  }
}
