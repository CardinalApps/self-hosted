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
} from '@cardinalapps/remote-access/dist/cjs'
import { fetchAuthAPI, MixedAppEnv } from '@cardinalapps/topology/dist/cjs'

import { DatabaseService } from '../../database/database.service'
import { ConnectSDKEvents, ConnectionState } from './connect-sdk.events'
import { ConnectAuthError, TokenRefresher } from './token-refresher'
import { OPTIONS } from '../../../utils/options'
import { envVar, getCurrentMode, Mode } from '../../../utils/env'
import { outboundHeaders } from '../../../utils/cloud'

// The subset of the `ws` client the service uses; injectable so tests can
// supply a fake socket
export type ConnectWebSocket = Pick<WebSocket, 'send' | 'close' | 'terminate' | 'on'>
export type ConnectWsFactory = (url: string) => ConnectWebSocket
export const CONNECT_WS_FACTORY = 'CONNECT_WS_FACTORY'

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
    @Inject(CONNECT_WS_FACTORY) private readonly wsFactory: ConnectWsFactory,
  ) {}

  /**
   * Connects on boot when the user has Remote Access enabled.
   */
  async onApplicationBootstrap(): Promise<void> {
    const enabled = await this.databaseService.getOption(OPTIONS.CONNECT_ENABLED.name)

    if (enabled === 'true' || enabled === true) {
      void this.connect()
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
      throw new Error(body?.message || `Cloud IDP returned ${response.status} while issuing a server token`)
    }

    const body = await response.json()

    await this.databaseService.saveOption(OPTIONS.CONNECT_SERVER_TOKEN.name, body.serverToken)
    await this.databaseService.saveOption(OPTIONS.CONNECT_ENABLED.name, 'true')
    this.tokenRefresher.clear()
    this.events.emit('enabled:changed', true)

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
        await this.databaseService.saveOption(OPTIONS.CONNECT_ENABLED.name, 'false')
        this.events.emit('enabled:changed', false)
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
    await this.databaseService.saveOption(OPTIONS.CONNECT_ENABLED.name, 'false')
    this.events.emit('enabled:changed', false)
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

    return {
      enabled: enabled === 'true' || enabled === true,
      state: this.state,
      hostname: (hostname as string) || null,
      signingKeyFingerprint: signingKey
        ? crypto.createHash('sha256').update(Buffer.from(signingKey as string, 'base64')).digest('hex').slice(0, 16)
        : null,
      tokenExpiresAt: tokenExpiresAt?.toISOString() ?? null,
    }
  }

  // Sends register and starts the heartbeat once the socket is up
  private async handleOpen(): Promise<void> {
    const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)
    const byoHostname = await this.databaseService.getOption(OPTIONS.CONNECT_BYO_HOSTNAME.name)
    const publicPortOption = await this.databaseService.getOption(OPTIONS.CONNECT_PUBLIC_PORT.name)
    const publicPort = publicPortOption
      ? Number(publicPortOption)
      : Number(envVar('CARDINAL_HOME_SERVER_PORT', 3080))

    this.sendMessage({
      type: 'register',
      instanceId: instanceId as string,
      publicPort,
      localIps: getLocalIps(),
      version: getServerVersion(),
      ...(byoHostname ? { byoHostname: byoHostname as string } : {}),
    })

    this.startHeartbeat()
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
 * Returns the LAN/public IPv4 addresses of this machine, excluding loopback
 * and link-local ranges.
 */
export function getLocalIps(): string[] {
  const ips: string[] = []

  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) {
        continue
      }
      if (address.address.startsWith('169.254.')) {
        continue
      }
      ips.push(address.address)
    }
  }

  return ips
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
