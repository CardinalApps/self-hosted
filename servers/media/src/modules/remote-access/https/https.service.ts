import * as crypto from 'crypto'
import * as http from 'http'
import * as https from 'https'
import * as tls from 'tls'
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'

import { DatabaseService } from '../../database/database.service'
import { ConnectSDKEvents } from '../connect/connect-sdk.events'
import { HttpsStatus, HttpsStatusStore } from '../connect/https-status.store'
import { ConnectSDKService, ENABLE_REMOTE_ACCESS_DIRECT } from '../connect/connect-sdk.service'
import { MuxService } from '../mux/mux.service'
import { PortMapperService } from '../port-mapper/port-mapper.service'
import { getPinnedHttpsPort, toPort } from '../ports'
import { OPTIONS, isOptionEnabled } from '../../../utils/options'

// The subset of the https server the service uses; injectable so tests can
// supply a fake
export type HttpsServerFactory = (options: https.ServerOptions, listener: http.RequestListener) => https.Server
export const HTTPS_SERVER_FACTORY = 'HTTPS_SERVER_FACTORY'

/* The external port a router is asked to open is drawn from this range so that Cardinal Media
   Servers are not all reachable on one well-known, scannable port. */
const EXTERNAL_PORT_MIN = 20000
const EXTERNAL_PORT_MAX = 60000

export type { HttpsStatus }

/**
 * Owns Remote Access TLS. While Remote Access is enabled with stored cert
 * material, the server's main port answers TLS handshakes as well as plain
 * HTTP, so direct connections need no port of their own. A deployment that
 * pinned `CONNECT_HTTPS_PORT` additionally gets a listener on that port.
 * Certs pushed over the control channel are hot-applied to new handshakes
 * without dropping existing connections.
 */
@Injectable()
export class HttpsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private requestListener: http.RequestListener | null = null
  private server: https.Server | null = null
  private port: number | null = null
  private certExpiresAt: string | null = null
  private lastError: string | null = null

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly events: ConnectSDKEvents,
    private readonly statusStore: HttpsStatusStore,
    private readonly connectSDKService: ConnectSDKService,
    private readonly portMapperService: PortMapperService,
    private readonly muxService: MuxService,
    @Inject(HTTPS_SERVER_FACTORY) private readonly serverFactory: HttpsServerFactory,
  ) {}

  /**
   * Reacts to cert pushes and to Remote Access — or the direct path on its own
   * — being enabled or disabled at runtime. Startup itself waits for attach().
   */
  onApplicationBootstrap(): void {
    this.events.on('cert:update', (cert) => void this.handleCertUpdate(cert.cert_pem, cert.key_pem))
    this.events.on('enabled:changed', (enabled) => void (enabled ? this.maybeStart() : this.stop()))
    this.events.on('direct:changed', (enabled) => void (enabled ? this.maybeStart() : this.stop()))
  }

  /**
   * Closes the listener gracefully on shutdown.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.stop()
  }

  /**
   * Receives the app's request listener from the bootstrap code once the main
   * port is bound, then starts TLS if it is configured.
   */
  attach(requestListener: http.RequestListener): void {
    this.requestListener = requestListener
    void this.maybeStart()
  }

  /**
   * Returns the listener state for the Admin UI.
   */
  getStatus(): HttpsStatus {
    return {
      state: this.server ? 'running' : (this.lastError ? 'error' : 'stopped'),
      port: this.port,
      certExpiresAt: this.certExpiresAt,
      lastError: this.lastError,
    }
  }

  /**
   * Starts answering TLS when Remote Access and the direct path are both
   * enabled and full cert material is stored; no-op otherwise. The main port
   * is where TLS is served. A port pinned with `CONNECT_HTTPS_PORT` (or the
   * stored `connect_https_port`) is bound as well, for deployments whose
   * external TLS port has to differ from the main one.
   */
  async maybeStart(): Promise<void> {
    if (this.server || !this.requestListener) {
      return
    }

    const enabled = await this.databaseService.getOption(OPTIONS.CONNECT_ENABLED.name)
    if (!isOptionEnabled(enabled)) {
      return
    }

    /* Turning the direct path off leaves the listener down, so nothing answers on the server's own
       hostname. Relayed traffic is unaffected — it arrives over the control channel. */
    if (!await this.connectSDKService.isPathEnabled(ENABLE_REMOTE_ACCESS_DIRECT)) {
      return
    }

    const certPem = await this.databaseService.getOption(OPTIONS.CONNECT_TLS_CERT_PEM.name) as string
    const keyPem = await this.databaseService.getOption(OPTIONS.CONNECT_TLS_KEY_PEM.name) as string
    if (!certPem || !keyPem) {
      return
    }

    if (!this.validateCertMaterial(certPem, keyPem)) {
      return
    }

    const pinnedPort = await this.getPinnedPort()
    const server = this.serverFactory({ cert: certPem, key: keyPem }, this.requestListener)

    if (pinnedPort !== null && !await this.bind(server, pinnedPort)) {
      return
    }

    server.on('error', (error) => Logger.error(`Remote Access TLS error: ${error}`, 'HTTPS'))
    this.muxService.setTlsServer(server)

    this.server = server
    this.port = pinnedPort ?? this.muxService.getPort()
    this.certExpiresAt = readCertExpiry(certPem)
    this.lastError = null
    this.publish()

    if (this.port === null) {
      return
    }

    Logger.log(`Remote Access is answering TLS on port ${this.port}`, 'HTTPS')

    /* The router is asked to forward to whichever port is serving TLS. Its external side stays
       random, so the mapping does not put a Cardinal server on a well-known port. */
    const desiredExternalPort = pinnedPort ?? crypto.randomInt(EXTERNAL_PORT_MIN, EXTERNAL_PORT_MAX)
    await this.portMapperService.mapIfEnabled(this.port, desiredExternalPort)
  }

  /**
   * Stops answering TLS, on the main port and on a pinned port alike. Existing
   * requests finish; idle keep-alive connections are dropped so close() cannot
   * hang forever.
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return
    }

    const server = this.server
    this.server = null
    this.port = null
    this.muxService.setTlsServer(null)

    await new Promise<void>((resolve) => {
      server.close(() => resolve())
      // Not in this @types/node version yet; available since Node 18.2
      ;(server as https.Server & { closeIdleConnections?: () => void }).closeIdleConnections?.()
    })

    this.publish()
    Logger.log('Remote Access stopped answering TLS', 'HTTPS')
  }

  // Binds the legacy pinned port. A failure here is fatal to the start attempt: the deployment
  // asked for that exact port, and half-starting would advertise a port nothing answers on.
  private async bind(server: https.Server, port: number): Promise<boolean> {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, () => {
          server.off('error', reject)
          resolve()
        })
      })
    } catch (error) {
      this.lastError = `Could not bind the Remote Access HTTPS listener: ${error}`
      Logger.error(this.lastError, 'HTTPS')
      this.publish()
      return false
    }

    return true
  }

  // Applies pushed cert material to new handshakes only; existing sockets
  // are unaffected. Invalid material never replaces a working context.
  private async handleCertUpdate(certPem: string, keyPem: string): Promise<void> {
    if (!this.validateCertMaterial(certPem, keyPem)) {
      return
    }

    if (!this.server) {
      await this.maybeStart()
      return
    }

    this.server.setSecureContext({ cert: certPem, key: keyPem })
    this.certExpiresAt = readCertExpiry(certPem)
    this.lastError = null
    this.publish()
    Logger.log('Remote Access TLS certificate hot-reloaded', 'HTTPS')
  }

  private validateCertMaterial(certPem: string, keyPem: string): boolean {
    try {
      tls.createSecureContext({ cert: certPem, key: keyPem })
      return true
    } catch (error) {
      this.lastError = `Rejected invalid TLS certificate material: ${error}`
      Logger.error(this.lastError, 'HTTPS')
      this.publish()
      return false
    }
  }

  // Mirrors the listener state into the store the status endpoint reads
  private publish(): void {
    this.statusStore.set(this.getStatus())
  }

  // The port a dedicated listener was pinned to, if any. The env var is deployment truth, so it
  // outranks anything stored on the host.
  private async getPinnedPort(): Promise<number | null> {
    return getPinnedHttpsPort() ?? toPort(await this.databaseService.getOption(OPTIONS.CONNECT_HTTPS_PORT.name))
  }
}

// Returns the notAfter date of the PEM cert, or null when unreadable
function readCertExpiry(certPem: string): string | null {
  try {
    return new Date(new crypto.X509Certificate(certPem).validTo).toISOString()
  } catch {
    return null
  }
}
