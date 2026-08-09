import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'
import { DEFAULT_MEDIA_SERVER_PORT } from '@cardinalapps/remote-access/dist/cjs'

import {
  PortMapperFailureReason,
  PortMapperStatus,
  UPNP_CLIENT_FACTORY,
  UpnpClient,
  UpnpClientFactory,
} from './port-mapper.types'
import { DatabaseService } from '../database/database.service'
import { OPTIONS } from '../../utils/options'

const LEASE_TTL_S = 30 * 60
const RENEW_INTERVAL_MS = 20 * 60 * 1000
const MAX_PORT_CONFLICT_RETRIES = 10
const MAPPING_DESCRIPTION = 'Cardinal Media Server'

/**
 * Wraps the callback-based `nat-upnp` library behind a Promise API and owns
 * all mapping policy: boot-time activation, 20-minute lease renewal,
 * port-conflict retries, and unmapping on shutdown. The library can be
 * swapped or forked without changes elsewhere.
 */
@Injectable()
export class PortMapperService implements OnApplicationBootstrap, OnApplicationShutdown {
  private status: PortMapperStatus = { state: 'not_attempted' }
  private client: UpnpClient | null = null
  private renewTimer: NodeJS.Timeout | null = null
  private internalPort: number | null = null
  private externalPort: number | null = null

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(UPNP_CLIENT_FACTORY) private readonly clientFactory: UpnpClientFactory,
  ) {}

  /**
   * Attempts the mapping on boot when the user has port mapping enabled.
   */
  async onApplicationBootstrap(): Promise<void> {
    const enabled = await this.databaseService.getOption(OPTIONS.PORT_MAPPING_ENABLED.name)

    if (!(enabled === 'true' || enabled === true)) {
      this.status = { state: 'disabled' }
      return
    }

    // Boot must never wait on (or crash from) router probing
    void this.enable(DEFAULT_MEDIA_SERVER_PORT, DEFAULT_MEDIA_SERVER_PORT).catch((error) => {
      Logger.warn(`Port mapping failed unexpectedly at boot: ${error}`, 'PortMapper')
    })
  }

  /**
   * Removes the mapping on a clean shutdown. A crashed server relies on the
   * router expiring the lease instead.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.unmap()
    this.client?.close()
    this.client = null
  }

  /**
   * Creates the external → internal mapping, trying up to 10 ports above the
   * desired external port when the router reports a conflict. On success the
   * external port is persisted so it is reported to the Remote Access Server
   * in `register.publicPort`.
   */
  async enable(internalPort: number, desiredExternalPort: number): Promise<PortMapperStatus> {
    this.stopRenewal()
    this.internalPort = internalPort

    for (let offset = 0; offset <= MAX_PORT_CONFLICT_RETRIES; offset++) {
      const candidatePort = desiredExternalPort + offset

      try {
        await this.createMapping(candidatePort, internalPort)
      } catch (error) {
        const reason = classifyMappingError(error)

        if (reason === 'port_conflict') {
          continue
        }

        this.setStatus({ state: 'failed', reason, lastAttemptAt: new Date() })
        return this.status
      }

      this.externalPort = candidatePort

      this.setStatus({
        state: 'active',
        externalIp: await this.getExternalIp(),
        externalPort: candidatePort,
        internalPort,
        leaseExpiresAt: new Date(Date.now() + LEASE_TTL_S * 1000),
      })

      await this.databaseService.saveOption(OPTIONS.CONNECT_PUBLIC_PORT.name, String(candidatePort))
      this.startRenewal()

      return this.status
    }

    this.setStatus({ state: 'failed', reason: 'port_conflict', lastAttemptAt: new Date() })
    return this.status
  }

  /**
   * Removes the mapping, forgets the advertised public port, and persists the
   * disabled state.
   */
  async disable(): Promise<void> {
    await this.unmap()
    await this.databaseService.saveOption(OPTIONS.PORT_MAPPING_ENABLED.name, 'false')
    await this.databaseService.saveOption(OPTIONS.CONNECT_PUBLIC_PORT.name, '')
    this.setStatus({ state: 'disabled' })
  }

  /**
   * Returns the current mapping state.
   */
  getStatus(): PortMapperStatus {
    return this.status
  }

  /**
   * Returns the router's external IP, or null when it cannot be determined.
   */
  async getExternalIp(): Promise<string | null> {
    try {
      return await new Promise<string | null>((resolve, reject) => {
        this.getClient().externalIp((error, ip) => (error ? reject(error) : resolve(ip ?? null)))
      })
    } catch {
      return null
    }
  }

  // Refreshes the lease well before the router expires it
  private startRenewal(): void {
    this.stopRenewal()
    this.renewTimer = setInterval(() => void this.renew(), RENEW_INTERVAL_MS)
  }

  private stopRenewal(): void {
    if (this.renewTimer) {
      clearInterval(this.renewTimer)
      this.renewTimer = null
    }
  }

  // Re-creates the same mapping; a failure marks the state failed but keeps
  // the interval running so the next tick can recover
  private async renew(): Promise<void> {
    if (this.externalPort === null || this.internalPort === null) {
      return
    }

    try {
      await this.createMapping(this.externalPort, this.internalPort)
    } catch (error) {
      this.setStatus({ state: 'failed', reason: classifyMappingError(error), lastAttemptAt: new Date() })
      return
    }

    this.setStatus({
      state: 'active',
      externalIp: this.status.state === 'active' ? this.status.externalIp : await this.getExternalIp(),
      externalPort: this.externalPort,
      internalPort: this.internalPort,
      leaseExpiresAt: new Date(Date.now() + LEASE_TTL_S * 1000),
    })
  }

  // Removes the active mapping (best-effort) and stops renewing
  private async unmap(): Promise<void> {
    this.stopRenewal()

    if (this.client && this.externalPort !== null) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.client.portUnmapping({ public: this.externalPort }, (error) => (error ? reject(error) : resolve()))
        })
      } catch (error) {
        Logger.warn(`Could not remove the port mapping: ${error}`, 'PortMapper')
      }
    }

    this.externalPort = null
  }

  private createMapping(publicPort: number, privatePort: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.getClient().portMapping({
        public: publicPort,
        private: privatePort,
        ttl: LEASE_TTL_S,
        description: MAPPING_DESCRIPTION,
      }, (error) => (error ? reject(error) : resolve()))
    })
  }

  private getClient(): UpnpClient {
    if (!this.client) {
      this.client = this.clientFactory()
    }

    return this.client
  }

  private setStatus(next: PortMapperStatus): void {
    const previousState = this.status.state
    this.status = next

    if (previousState === next.state) {
      return
    }

    if (next.state === 'active') {
      Logger.log(`Port mapping active: ${next.externalIp ?? 'unknown IP'}:${next.externalPort}`, 'PortMapper')
    } else if (next.state === 'failed') {
      Logger.warn(`Port mapping failed: ${next.reason}`, 'PortMapper')
    } else if (next.state === 'disabled') {
      Logger.log('Port mapping disabled', 'PortMapper')
    }
  }
}

/**
 * Normalizes the library's errors to a stable set of reasons. Conflicts are
 * retryable on another port; anything else aborts the attempt.
 */
export function classifyMappingError(error: unknown): PortMapperFailureReason {
  const message = error instanceof Error ? error.message : String(error)
  const code = (error as NodeJS.ErrnoException)?.code

  if (/conflict/i.test(message) || message.includes('718')) {
    return 'port_conflict'
  }

  if (
    code === 'ETIMEDOUT' || code === 'ENOTFOUND' || code === 'EHOSTUNREACH' ||
    /timed? ?out|no.*gateway/i.test(message)
  ) {
    return 'no_gateway'
  }

  return 'unknown'
}
