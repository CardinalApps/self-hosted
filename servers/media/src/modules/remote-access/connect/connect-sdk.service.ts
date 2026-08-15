import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'
import type { WebSocket } from 'ws'
import {
  MediaToServerMessage,
  ServerToMediaMessage,
  WSS_CLOSE_FORBIDDEN,
  WSS_CLOSE_SUPERSEDED,
  WSS_PATH,
  decodeRelayBinaryFrame,
  encodeRelayBinaryFrame,
} from '@cardinalapps/remote-access/dist/cjs'
import { fetchAuthAPI, MixedAppEnv } from '@cardinalapps/topology/dist/cjs'

import { DatabaseService } from '../../database/database.service'
import { ConnectSDKEvents, ConnectionState } from './connect-sdk.events'
import { HttpsStatus, HttpsStatusStore } from './https-status.store'
import { ConnectAuthError, TokenRefresher } from './token-refresher'
import { getPinnedHttpsPort, resolvePublicPort, toPort } from '../ports'
import { SettingsService } from '../../settings/settings.service'
import { SettingsEvents, SettingsChangedEventPayload } from '../../settings/events'
import { SettingName } from '../../settings/types'
import { EventService } from '../../event/event.service'
import { CardinalApp } from '../../../utils/apps'
import { OPTIONS, isOptionEnabled } from '../../../utils/options'
import { envVar, getCurrentMode, Mode } from '../../../utils/env'
import { outboundHeaders } from '../../../utils/cloud'

// The subset of the `ws` client the service uses; injectable so tests can
// supply a fake socket
export type ConnectWebSocket = Pick<WebSocket, 'send' | 'close' | 'terminate' | 'on'>
export type ConnectWsFactory = (url: string) => ConnectWebSocket
export const CONNECT_WS_FACTORY = 'CONNECT_WS_FACTORY'

// A refusal from the cloud IDP while enabling, kept with its HTTP status so
// the controller can pass meaningful refusals (like a full slot allowance)
// through to the Admin app instead of flattening them into a 500
export class CloudEnableError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export const ENABLE_REMOTE_ACCESS = 'enable_remote_access'
export const ENABLE_REMOTE_ACCESS_DIRECT = 'enable_remote_access_direct'
export const ENABLE_REMOTE_ACCESS_RELAY = 'enable_remote_access_relay'

const PING_INTERVAL_MS = 30_000
const PONG_TIMEOUT_MS = 90_000
const RECONNECT_BASE_MS = 1_000
const RECONNECT_CAP_MS = 60_000

export type ConnectStatus = {
  enabled: boolean,
  state: ConnectionState,
  hostname: string | null,
  signingKeyFingerprint: string | null,
  tokenExpiresAt: string | null,
  publicPort: number | null,
  directUrl: string | null,
  relayUrl: string | null,
  https: HttpsStatus,
}

/**
 * Maintains the WSS control channel to the Remote Access Server: register on
 * connect, heartbeat, reconnect with backoff, and token refresh. Everything
 * received on the channel is fanned out through ConnectSDKEvents; cert
 * hot-reload, the probe middleware, and relay dispatch live in other modules.
 */
@Injectable()
export class ConnectSDKService implements OnApplicationBootstrap, OnApplicationShutdown {
  private ws: ConnectWebSocket | null = null
  private state: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingTimer: NodeJS.Timeout | null = null
  private lastPongAt = 0
  private manualStop = false

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tokenRefresher: TokenRefresher,
    private readonly events: ConnectSDKEvents,
    private readonly httpsStatusStore: HttpsStatusStore,
    private readonly settingsService: SettingsService,
    private readonly eventService: EventService,
    @Inject(CONNECT_WS_FACTORY) private readonly wsFactory: ConnectWsFactory,
  ) {}

  /**
   * Connects on boot when the user has Remote Access enabled, and starts
   * watching for path changes made through the settings API.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.eventService.subscribePrivate(this, SettingsEvents.CHANGED, (payload: SettingsChangedEventPayload) => {
      void this.handleSettingsChanged(payload?.names ?? [])
    })

    const enabled = await this.databaseService.getOption(OPTIONS.CONNECT_ENABLED.name)

    if (isOptionEnabled(enabled)) {
      void this.connect()
    }
  }

  /*
   * The paths are ordinary settings, so they change without going through this module. Translate
   * that into the internal events the listener and the relay handler already follow, and tell the
   * Remote Access Server so it stops offering a path the owner turned off.
   */
  private async handleSettingsChanged(names: string[]): Promise<void> {
    const directChanged = names.includes(ENABLE_REMOTE_ACCESS_DIRECT)
    const relayChanged = names.includes(ENABLE_REMOTE_ACCESS_RELAY)

    if (!directChanged && !relayChanged) {
      return
    }

    if (directChanged) {
      this.events.emit('direct:changed', await this.isPathEnabled(ENABLE_REMOTE_ACCESS_DIRECT))
    }

    if (relayChanged) {
      this.events.emit('relay:changed', await this.isPathEnabled(ENABLE_REMOTE_ACCESS_RELAY))
    }

    if (this.state === 'connected') {
      await this.sendRegister()
    }
  }

  /**
   * Closes the socket cleanly on shutdown without touching the enabled state.
   */
  onApplicationShutdown(): void {
    this.manualStop = true
    this.cancelReconnect()
    this.stopHeartbeat()
    this.ws?.close(1000)
    this.ws = null
  }

  /**
   * Obtains a server token from the cloud IDP using the admin's cloud JWT,
   * stores it, marks Remote Access enabled, and connects.
   */
  async enable(cloudJwt: string): Promise<void> {
    const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)

    const response = await fetchAuthAPI<Response>('/user/server-tokens', 'POST', getCurrentMode() as MixedAppEnv, {
      headers: {
        ...outboundHeaders(),
        Authorization: `Bearer ${cloudJwt}`,
      },
      body: { instanceId: instanceId as string },
      returnRawResponse: true,
    })

    if (response.status !== 201) {
      const body = await response.json().catch(() => null)
      throw new CloudEnableError(
        body?.message || `Cloud IDP returned ${response.status} while issuing a server token`,
        response.status,
      )
    }

    const body = await response.json()

    await this.databaseService.saveOption(OPTIONS.CONNECT_SERVER_TOKEN.name, body.serverToken)
    await this.setEnabled(true)
    this.tokenRefresher.clear()

    Logger.log('Remote Access enabled', 'ConnectSDK')
    void this.connect()
  }

  /**
   * Disables Remote Access and closes the control channel. When the admin's
   * cloud JWT is provided, also revokes the server token cloud-side
   * (best-effort) and forgets it locally.
   */
  async disable(cloudJwt?: string): Promise<void> {
    await this.disconnect()

    if (cloudJwt) {
      try {
        const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)
        await fetchAuthAPI(`/user/server-tokens/${instanceId}`, 'DELETE', getCurrentMode() as MixedAppEnv, {
          headers: {
            ...outboundHeaders(),
            Authorization: `Bearer ${cloudJwt}`,
          },
          returnRawResponse: true,
        })
        await this.databaseService.saveOption(OPTIONS.CONNECT_SERVER_TOKEN.name, '')
        this.tokenRefresher.clear()
      } catch (err) {
        Logger.warn(`Could not revoke the server token with the cloud IDP: ${err}`, 'ConnectSDK')
      }
    }

    Logger.log('Remote Access disabled', 'ConnectSDK')
  }

  /**
   * Opens the WSS control channel. Reconnection is handled internally;
   * callers only ever call this once per enable.
   */
  async connect(): Promise<void> {
    if (this.ws) {
      return
    }

    this.manualStop = false
    this.setState('connecting')

    let token: string
    try {
      token = await this.tokenRefresher.getCurrentToken()
    } catch (err) {
      if (err instanceof ConnectAuthError) {
        await this.setEnabled(false)
        this.setState('auth_failed')
        Logger.error(`Remote Access disabled: ${err.message}`, 'ConnectSDK')
        return
      }

      Logger.warn(`Could not refresh the Remote Access token, retrying later: ${err}`, 'ConnectSDK')
      this.setState('disconnected')
      this.scheduleReconnect()
      return
    }

    // Local development talks to a local Remote Access Server over plain ws://
    const protocol = getCurrentMode() === Mode.DEVELOPMENT ? 'ws' : 'wss'
    const host = envVar('CONNECT_HOST', 'ws.cardinalapps.host')
    const url = `${protocol}://${host}${WSS_PATH}?token=${encodeURIComponent(token)}`

    let ws: ConnectWebSocket
    try {
      ws = this.wsFactory(url)
    } catch (err) {
      Logger.warn(`Could not open the Remote Access socket: ${err}`, 'ConnectSDK')
      this.setState('disconnected')
      this.scheduleReconnect()
      return
    }

    this.ws = ws
    ws.on('open', () => void this.handleOpen())
    ws.on('message', (data: Buffer, isBinary: boolean) => void this.handleMessage(data, isBinary))
    ws.on('close', (code: number) => this.handleClose(code))
    ws.on('error', (err: Error) => Logger.warn(`Remote Access socket error: ${err.message}`, 'ConnectSDK'))
  }

  /**
   * User-initiated disconnect: persists the disabled state and stops all
   * reconnection.
   */
  async disconnect(): Promise<void> {
    this.manualStop = true
    await this.setEnabled(false)
    this.cancelReconnect()
    this.stopHeartbeat()
    this.ws?.close(1000)
    this.ws = null
    this.setState('disconnected')
  }

  /**
   * Returns the state consumed by the Admin UI.
   */
  async getStatus(): Promise<ConnectStatus> {
    const enabled = await this.databaseService.getOption(OPTIONS.CONNECT_ENABLED.name)
    const hostname = await this.databaseService.getOption(OPTIONS.CONNECT_HOSTNAME.name)
    const signingKey = await this.databaseService.getOption(OPTIONS.CONNECT_SIGNING_KEY.name)
    const tokenExpiresAt = await this.tokenRefresher.getServerTokenExpiry()
    const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)
    // No fallback here: the UI should say nothing rather than name a port nobody can be reached on
    const publicPort = await this.getPublicPort(null)

    return {
      enabled: isOptionEnabled(enabled),
      state: this.state,
      hostname: (hostname as string) || null,
      signingKeyFingerprint: signingKey
        ? crypto.createHash('sha256').update(Buffer.from(signingKey as string, 'base64')).digest('hex').slice(0, 16)
        : null,
      tokenExpiresAt: tokenExpiresAt?.toISOString() ?? null,
      publicPort,
      directUrl: buildDirectUrl(hostname as string, publicPort),
      relayUrl: instanceId ? `https://${envVar('CONNECT_RELAY_HOST', 'relay.cardinalapps.host')}/relay/${instanceId}` : null,
      https: this.httpsStatusStore.get(),
    }
  }

  // The externally reachable port; see resolvePublicPort for how the sources rank
  private async getPublicPort(fallbackPort: number | null): Promise<number | null> {
    const mappedPort = await this.databaseService.getOption(OPTIONS.CONNECT_PUBLIC_PORT.name)
    const upnpEnabled = await this.databaseService.getOption(OPTIONS.PORT_MAPPING_ENABLED.name)

    return resolvePublicPort({
      mappedPort: toPort(mappedPort),
      upnpEnabled: isOptionEnabled(upnpEnabled),
      pinnedPort: getPinnedHttpsPort(),
      fallbackPort,
    })
  }

  /*
   * Persists the enabled state and mirrors it into the setting the Admin app reads. The option
   * stays authoritative for the server's own boot decisions; the setting exists so the toggle
   * renders in the right position on first paint instead of flipping once a request comes back.
   */
  private async setEnabled(enabled: boolean): Promise<void> {
    await this.databaseService.saveOption(OPTIONS.CONNECT_ENABLED.name, String(enabled))
    await this.settingsService.set(CardinalApp.ADMIN, { [ENABLE_REMOTE_ACCESS]: enabled })
    this.events.emit('enabled:changed', enabled)
  }

  /**
   * Whether a connection path is on. Both default to on, so enabling Remote
   * Access lights up direct and relay without writing either first.
   */
  async isPathEnabled(slug: SettingName): Promise<boolean> {
    const value = await this.settingsService.get(CardinalApp.ADMIN, slug)

    return value === null || value === undefined ? true : value === true || value === 'true'
  }

  /**
   * Sends a relay control message on behalf of the RelayRequestHandler.
   */
  sendRelayMessage(message: MediaToServerMessage): void {
    this.sendMessage(message)
  }

  /**
   * Sends a relay response body chunk as a binary frame.
   */
  sendRelayBinary(requestId: string, chunk: Uint8Array): void {
    try {
      this.ws?.send(encodeRelayBinaryFrame(requestId, chunk))
    } catch (err) {
      Logger.warn(`Could not send a relay binary frame: ${err}`, 'ConnectSDK')
    }
  }

  // Sends register and starts the heartbeat once the socket is up
  private async handleOpen(): Promise<void> {
    await this.sendRegister()
    this.startHeartbeat()
  }

  // Tells the Remote Access Server how to reach this server and which paths are on
  private async sendRegister(): Promise<void> {
    const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)
    const byoHostname = await this.databaseService.getOption(OPTIONS.CONNECT_BYO_HOSTNAME.name)
    const fallbackPort = Number(envVar('CARDINAL_HOME_SERVER_PORT', 3080))
    const publicPort = (await this.getPublicPort(fallbackPort)) ?? fallbackPort

    this.sendMessage({
      type: 'register',
      instanceId: instanceId as string,
      publicPort,
      localIps: getLocalIps(),
      version: getServerVersion(),
      ...(byoHostname ? { byoHostname: byoHostname as string } : {}),
      directEnabled: await this.isPathEnabled(ENABLE_REMOTE_ACCESS_DIRECT),
      relayEnabled: await this.isPathEnabled(ENABLE_REMOTE_ACCESS_RELAY),
    })
  }

  // Routes JSON control messages and binary relay frames
  private async handleMessage(data: Buffer, isBinary: boolean): Promise<void> {
    if (isBinary) {
      try {
        const { requestId, chunk } = decodeRelayBinaryFrame(new Uint8Array(data))
        this.events.emit('binary:frame', { requestId, chunk })
      } catch (err) {
        Logger.warn(`Dropped an undecodable Remote Access binary frame: ${err}`, 'ConnectSDK')
      }
      return
    }

    let message: ServerToMediaMessage
    try {
      message = JSON.parse(data.toString())
    } catch {
      Logger.warn('Dropped an unparseable Remote Access control message', 'ConnectSDK')
      return
    }

    switch (message.type) {
      case 'registered': {
        await this.databaseService.saveOption(OPTIONS.CONNECT_SIGNING_KEY.name, message.signingKey)
        await this.databaseService.saveOption(OPTIONS.CONNECT_HOSTNAME.name, message.hostname)
        if (message.cert) {
          await this.databaseService.saveOption(OPTIONS.CONNECT_TLS_CERT_PEM.name, message.cert.cert_pem)
          await this.databaseService.saveOption(OPTIONS.CONNECT_TLS_KEY_PEM.name, message.cert.key_pem)
        }

        this.reconnectAttempts = 0
        this.setState('connected')
        this.events.emit('registered', message)
        if (message.cert) {
          this.events.emit('cert:update', message.cert)
        }
        Logger.log(`Registered with the Remote Access Server as ${message.hostname}`, 'ConnectSDK')
        break
      }

      case 'pong': {
        this.lastPongAt = Date.now()
        break
      }

      case 'config:update': {
        if (message.signingKey) {
          await this.databaseService.saveOption(OPTIONS.CONNECT_SIGNING_KEY.name, message.signingKey)
        }
        this.events.emit('config:update', message)
        break
      }

      case 'cert:update': {
        await this.databaseService.saveOption(OPTIONS.CONNECT_TLS_CERT_PEM.name, message.cert_pem)
        await this.databaseService.saveOption(OPTIONS.CONNECT_TLS_KEY_PEM.name, message.key_pem)
        this.events.emit('cert:update', message)
        break
      }

      case 'relay:http:request': {
        this.events.emit('relay:http:request', message)
        break
      }

      case 'relay:http:request:end': {
        this.events.emit('relay:http:request:end', message)
        break
      }

      case 'relay:abort': {
        this.events.emit('relay:abort', message)
        break
      }

      default:
        // Unknown types are ignored for forward compatibility
        break
    }
  }

  // Decides whether a closed socket should reconnect
  private handleClose(code: number): void {
    this.stopHeartbeat()
    this.ws = null

    if (this.manualStop) {
      this.setState('disconnected')
      return
    }

    if (code === WSS_CLOSE_FORBIDDEN) {
      this.setState('auth_failed')
      Logger.error('The Remote Access Server rejected this instance: it is registered to a different cloud account. Not reconnecting.', 'ConnectSDK')
      return
    }

    if (code === WSS_CLOSE_SUPERSEDED) {
      this.setState('disconnected')
      Logger.warn('Another Media Server registered with this instance ID and superseded this connection. Not reconnecting.', 'ConnectSDK')
      return
    }

    this.setState('disconnected')
    this.scheduleReconnect()
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.lastPongAt = Date.now()
    this.pingTimer = setInterval(() => {
      if (Date.now() - this.lastPongAt > PONG_TIMEOUT_MS) {
        Logger.warn('No pong from the Remote Access Server in 90s, dropping the connection', 'ConnectSDK')
        this.ws?.terminate()
        return
      }
      this.sendMessage({ type: 'ping' })
    }, PING_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  // 1s, 2s, 4s … capped at 60s, with ±25% jitter, forever
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.manualStop) {
      return
    }

    const base = Math.min(RECONNECT_CAP_MS, RECONNECT_BASE_MS * 2 ** Math.min(this.reconnectAttempts, 10))
    const delay = Math.round(base * (0.75 + Math.random() * 0.5))
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, delay)
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private sendMessage(message: MediaToServerMessage): void {
    try {
      this.ws?.send(JSON.stringify(message))
    } catch (err) {
      Logger.warn(`Could not send on the Remote Access socket: ${err}`, 'ConnectSDK')
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) {
      return
    }
    this.state = state
    this.events.emit('connection:state', state)
  }
}

/**
 * Returns the LAN/public IP addresses of this machine — IPv4 plus global/ULA IPv6 — excluding
 * loopback and link-local ranges. The v6 entries are what let the cloud offer direct-connect
 * candidates to households with no inbound IPv4 (CGNAT).
 */
export function getLocalIps(interfaces = os.networkInterfaces()): string[] {
  const ips: string[] = []

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.internal) {
        continue
      }
      if (address.family === 'IPv4') {
        if (address.address.startsWith('169.254.')) {
          continue
        }
        ips.push(address.address)
      } else if (address.family === 'IPv6') {
        if (address.scopeid !== 0 || address.address.toLowerCase().startsWith('fe80')) {
          continue
        }
        ips.push(address.address)
      }
    }
  }

  return ips
}

/*
 * The address clients dial directly. Null until the Remote Access Server has assigned a hostname,
 * because the certificate only validates against that name. The port is omitted when it is 443,
 * which is what a Path 1 reverse proxy in front of this server would use.
 */
function buildDirectUrl(hostname: string | null, publicPort: number | null): string | null {
  if (!hostname) {
    return null
  }

  return publicPort && publicPort !== 443
    ? `https://${hostname}:${publicPort}`
    : `https://${hostname}`
}

// Same resolution order as AppService.getHomeServerVersion, without the module dependency
function getServerVersion(): string {
  if (process?.env?.npm_package_version) {
    return process.env.npm_package_version
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf8'))
    return pkg?.version || 'Unknown'
  } catch {
    return 'Unknown'
  }
}
