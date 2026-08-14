import * as crypto from 'crypto'
import * as http from 'http'
import * as https from 'https'
import * as tls from 'tls'
import { AddressInfo } from 'net'
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'

import { DatabaseService } from '../../database/database.service'
import { ConnectSDKEvents } from '../connect/connect-sdk.events'
import { HttpsStatus, HttpsStatusStore } from '../connect/https-status.store'
import { PortMapperService } from '../port-mapper/port-mapper.service'
import { OPTIONS, isOptionEnabled } from '../../../utils/options'

// The subset of the https server the service uses; injectable so tests can
// supply a fake
export type HttpsServerFactory = (options: https.ServerOptions, listener: http.RequestListener) => https.Server
export const HTTPS_SERVER_FACTORY = 'HTTPS_SERVER_FACTORY'

/* When the user has not pinned a port, the desired external port is drawn
   from this range so that Cardinal Media Servers do not all listen on one
   well-known, scannable port. */
const EXTERNAL_PORT_MIN = 20000
const EXTERNAL_PORT_MAX = 60000

export type { HttpsStatus }

/**
 * Owns the Remote Access HTTPS listener. The listener is a second front door
 * that only exists while Remote Access is enabled with stored cert material —
 * the regular HTTP listener is never touched. Certs pushed over the control
 * channel are hot-applied to new TLS handshakes without dropping existing
 * connections.
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
    private readonly portMapperService: PortMapperService,
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
   * Receives the app's request listener from the bootstrap code once the
   * regular HTTP listener is up, then starts HTTPS if it is configured.
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
   * Starts the listener when Remote Access and the direct path are both
   * enabled and full cert material is stored; no-op otherwise. A user-pinned
   * `connect_https_port` is bound exactly (manual port-forwarding needs a
   * stable target); otherwise the OS assigns a random free port and UPnP
   * advertises it transparently.
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
    const directEnabled = await this.databaseService.getOption(OPTIONS.CONNECT_DIRECT_ENABLED.name)
    if (!isOptionEnabled(directEnabled, true)) {
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

    const configuredPort = await this.getConfiguredPort()
    const server = this.serverFactory({ cert: certPem, key: keyPem }, this.requestListener)

    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(configuredPort ?? 0, () => resolve())
      })
    } catch (error) {
      this.lastError = `Could not bind the Remote Access HTTPS listener: ${error}`
      Logger.error(this.lastError, 'HTTPS')
      this.publish()
      return
    }

    server.on('error', (error) => Logger.error(`Remote Access HTTPS listener error: ${error}`, 'HTTPS'))

    this.server = server
    this.port = (server.address() as AddressInfo).port
    this.certExpiresAt = readCertExpiry(certPem)
    this.lastError = null
    this.publish()
    Logger.log(`Remote Access HTTPS listening on port ${this.port}`, 'HTTPS')

    const desiredExternalPort = configuredPort ?? crypto.randomInt(EXTERNAL_PORT_MIN, EXTERNAL_PORT_MAX)
    await this.portMapperService.mapIfEnabled(this.port, desiredExternalPort)
  }

  /**
   * Stops the listener. Existing requests finish; idle keep-alive
   * connections are dropped so close() cannot hang forever.
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return
    }

    const server = this.server
    this.server = null
    this.port = null

    await new Promise<void>((resolve) => {
      server.close(() => resolve())
      // Not in this @types/node version yet; available since Node 18.2
      ;(server as https.Server & { closeIdleConnections?: () => void }).closeIdleConnections?.()
    })

    this.publish()
    Logger.log('Remote Access HTTPS listener stopped', 'HTTPS')
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

  private async getConfiguredPort(): Promise<number | null> {
    const value = await this.databaseService.getOption(OPTIONS.CONNECT_HTTPS_PORT.name)
    const port = Number(value)

    return value && Number.isInteger(port) && port > 0 && port <= 65535 ? port : null
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
