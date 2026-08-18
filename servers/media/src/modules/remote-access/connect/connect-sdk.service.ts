import * as fs from 'fs'
import * as os from 'os'
import * as net from 'net'
import * as path from 'path'
import * as crypto from 'crypto'
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'
import type { WebSocket } from 'ws'
import {
  MediaToServerMessage,
  ServerToMediaMessage,
  WSS_CLOSE_BANNED,
  WSS_CLOSE_FORBIDDEN,
  WSS_CLOSE_NOT_APPROVED,
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
import { isDockerBridgeAddress, looksLikeDockerBridge } from '../docker'
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

// A refusal from the cloud IDP while enabling, kept with its HTTP status and error code so the
// controller can pass meaningful refusals (a full slot allowance, an unapproved account) through
// to the Admin app instead of flattening them into a 500
export class CloudEnableError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message)
  }
}

export const ENABLE_REMOTE_ACCESS = 'enable_remote_access'
export const ENABLE_REMOTE_ACCESS_DIRECT = 'enable_remote_access_direct'
export const ENABLE_REMOTE_ACCESS_RELAY = 'enable_remote_access_relay'

// The cloud IDP's code for "this account has no approved access to a Remote Access feature yet"
export const SERVICE_ACCESS_REQUIRED = 'service_access_required'

// Refused mints that are the cloud having a bad minute rather than an answer about the account
const TRANSIENT_MINT_STATUSES = [408, 425, 429]

// Whether a refused mint is the cloud's last word on this account, which is what ends a held-open wait
function isFinalMintRefusal(status: number): boolean {
  return status < 500 && !TRANSIENT_MINT_STATUSES.includes(status)
}

const PING_INTERVAL_MS = 30_000
const PONG_TIMEOUT_MS = 90_000
const RECONNECT_BASE_MS = 1_000
const RECONNECT_CAP_MS = 60_000

/*
 * Retry cadence for refusals that only somebody else can clear: an approval, or a lifted
 * suspension. The backoff schedule would spend hours knocking on a door that has already been
 * answered, but never retrying would mean an approval only takes effect on the next restart.
 */
export const SLOW_RETRY_MS = 15 * 60 * 1000

/*
 * The first application close code this client has no meaning for. Newer gate codes land here, and
 * they get the slow retry so an old client waiting on a decision cannot hot-loop the server.
 */
const UNKNOWN_CLOSE_CODE_FLOOR = 4006
const APPLICATION_CLOSE_CODE_CEILING = 4999

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
  private pendingEnableJwt: string | null = null

  // The slow-retry cadence, mutable so tests do not have to wait out a real 15 minutes
  static slowRetryMs = SLOW_RETRY_MS

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
    const response = await this.mintServerToken(cloudJwt)

    if (response.status === 201) {
      await this.acceptServerToken(await response.json())
      return
    }

    const body = await response.json().catch(() => null)

    /*
     * The cloud files the account's access requests as it refuses, so the refusal is already the
     * queue entry. Hold the enable open and keep asking rather than dropping the owner back to a
     * toggle they have to remember to flip again.
     */
    if (response.status === 403 && body?.code === SERVICE_ACCESS_REQUIRED) {
      // Enabling is the owner asking for the channel, which clears any earlier manual stop
      this.manualStop = false
      this.pendingEnableJwt = cloudJwt
      this.setState('not_approved')
      await this.recordEnableIntent(true)
      this.scheduleSlowRetry()
      Logger.log('Remote Access is waiting on cloud service access approval', 'ConnectSDK')
    }

    throw new CloudEnableError(
      body?.message || `Cloud IDP returned ${response.status} while issuing a server token`,
      response.status,
      body?.code,
    )
  }

  // Asks the cloud IDP for a long-lived server token; raw so refusals keep their status and code
  private async mintServerToken(cloudJwt: string): Promise<Response> {
    const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)

    return await fetchAuthAPI<Response>('/user/server-tokens', 'POST', getCurrentMode() as MixedAppEnv, {
      headers: {
        ...outboundHeaders(),
        Authorization: `Bearer ${cloudJwt}`,
      },
      body: { instanceId: instanceId as string },
      returnRawResponse: true,
    })
  }

  // Stores a freshly minted server token, marks Remote Access enabled, and opens the channel
  private async acceptServerToken(body: { serverToken: string }): Promise<void> {
    this.pendingEnableJwt = null
    await this.databaseService.saveOption(OPTIONS.CONNECT_SERVER_TOKEN.name, body.serverToken)
    await this.setEnabled(true)
    this.tokenRefresher.clear()

    Logger.log('Remote Access enabled', 'ConnectSDK')
    void this.connect()
  }

  /*
   * Re-attempts a mint the cloud refused for want of access. The admin's cloud JWT is only good for
   * so long, so a refusal that is not the access gate ends the wait and leaves it to the owner.
   */
  private async retryPendingEnable(): Promise<void> {
    const cloudJwt = this.pendingEnableJwt

    if (!cloudJwt) {
      return
    }

    let response: Response
    try {
      response = await this.mintServerToken(cloudJwt)
    } catch (err) {
      Logger.warn(`Could not reach the cloud IDP while waiting on Remote Access approval: ${err}`, 'ConnectSDK')
      this.scheduleSlowRetry()
      return
    }

    if (response.status === 201) {
      await this.acceptServerToken(await response.json())
      return
    }

    const body = await response.json().catch(() => null)

    if (response.status === 403 && body?.code === SERVICE_ACCESS_REQUIRED) {
      this.scheduleSlowRetry()
      return
    }

    /* An approval can be days away, so only the cloud actually answering about this account ends the
     * wait. A 5xx or a rate limit is the cloud having a bad minute, and giving up on one of those
     * would leave the eventual approval with nobody waiting for it.
     */
    if (!isFinalMintRefusal(response.status)) {
      Logger.warn(`The cloud IDP returned ${response.status} while waiting on Remote Access approval; still waiting`, 'ConnectSDK')
      this.scheduleSlowRetry()
      return
    }

    this.pendingEnableJwt = null
    await this.recordEnableIntent(false)
    Logger.warn(`Stopped waiting on Remote Access approval: the cloud IDP returned ${response.status}`, 'ConnectSDK')
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
    this.pendingEnableJwt = null
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
    const relayHost = await this.databaseService.getOption(OPTIONS.CONNECT_RELAY_HOST.name)
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
      relayUrl: instanceId
        ? `https://${(relayHost as string) || envVar('CONNECT_RELAY_HOST', 'relay.cardinalapps.host')}/relay/${instanceId}`
        : null,
      https: this.httpsStatusStore.get(),
    }
  }

  // The externally reachable port; see resolvePublicPort for how the sources rank
  private async getPublicPort(fallbackPort: number | null): Promise<number | null> {
    const mappedPort = await this.databaseService.getOption(OPTIONS.CONNECT_PUBLIC_PORT.name)

    return resolvePublicPort({
      mappedPort: toPort(mappedPort),
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

  /*
   * Records that the owner asked for Remote Access, in the one place the Admin app looks. Only the
   * setting moves: the option stays where it is because there is no channel to bring up on boot
   * until a server token exists, and the toggle would otherwise be the only way out of the queue.
   */
  private async recordEnableIntent(enabled: boolean): Promise<void> {
    await this.settingsService.set(CardinalApp.ADMIN, { [ENABLE_REMOTE_ACCESS]: enabled })
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
      localIps: resolveLanIps(),
      version: getServerVersion(),
      ...(byoHostname ? { byoHostname: byoHostname as string } : {}),
      directEnabled: await this.isPathEnabled(ENABLE_REMOTE_ACCESS_DIRECT),
      relayEnabled: await this.isPathEnabled(ENABLE_REMOTE_ACCESS_RELAY),
    })
  }

  /*
   * Keeps the relay hostname the Remote Access Server advertises, when it advertises one. The
   * built-in fallback names the production relay, which is the wrong address on a stack that runs
   * its own. Display-only: nothing dials the relay from this side.
   */
  private async rememberRelayHostname(hostname: unknown): Promise<void> {
    if (typeof hostname !== 'string' || !hostname) {
      return
    }

    await this.databaseService.saveOption(OPTIONS.CONNECT_RELAY_HOST.name, hostname)
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
        await this.rememberRelayHostname(message.config?.relayHostname)
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
        await this.rememberRelayHostname(message.relayHostname)
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

    if (code === WSS_CLOSE_BANNED) {
      this.setState('suspended')
      Logger.error('The Remote Access Server refused this connection: this Media Server is suspended. Retrying periodically.', 'ConnectSDK')
      this.scheduleSlowRetry()
      return
    }

    if (code === WSS_CLOSE_NOT_APPROVED) {
      this.setState('not_approved')
      Logger.warn('The Remote Access Server refused this connection: the cloud account has no approved access. Retrying periodically.', 'ConnectSDK')
      this.scheduleSlowRetry()
      return
    }

    if (code >= UNKNOWN_CLOSE_CODE_FLOOR && code <= APPLICATION_CLOSE_CODE_CEILING) {
      this.setState('disconnected')
      Logger.warn(`The Remote Access Server closed the connection with an unrecognized code (${code}). Retrying periodically.`, 'ConnectSDK')
      this.scheduleSlowRetry()
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

  /*
   * The recovery path for a refusal that clears on someone else's action. It shares the reconnect
   * timer slot so a manual disable cancels it like any other pending attempt, and it resumes
   * whichever half of the handshake was refused: the token mint, or the socket.
   */
  private scheduleSlowRetry(): void {
    if (this.reconnectTimer || this.manualStop) {
      return
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void (this.pendingEnableJwt ? this.retryPendingEnable() : this.connect())
    }, ConnectSDKService.slowRetryMs)
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

// The advice is worth saying once at startup, not on every register the socket makes
let warnedAboutBridgedLan = false

/**
 * The addresses advertised to the Remote Access Server as this server's LAN candidates.
 *
 * `CONNECT_LAN_IPS` wins outright: on a bridged container, or behind any other layer of address
 * translation, only the deployment knows the address clients can actually dial. Failing that the
 * interfaces are the answer, minus the container's own bridge address — a candidate nothing outside
 * the bridge can reach costs every LAN-first client a connection timeout before it falls back.
 */
export function resolveLanIps(
  configured = envVar('CONNECT_LAN_IPS', null),
  interfaces = os.networkInterfaces(),
  inContainer = fs.existsSync('/.dockerenv'),
): string[] {
  const declared = parseLanIps(configured)

  if (declared.length) {
    return declared
  }

  const detected = getLocalIps(interfaces)

  if (!looksLikeDockerBridge(inContainer, interfaces)) {
    return detected
  }

  if (!warnedAboutBridgedLan) {
    warnedAboutBridgedLan = true
    Logger.warn(
      'This server is on a Docker bridge network, so the address it sees is not one your other devices can reach. '
      + 'It will not be offered for local connections. Set CONNECT_LAN_IPS to this machine\'s address on your '
      + 'network so nearby devices connect directly instead of over the internet.',
      'ConnectSDK',
    )
  }

  return detected.filter((address) => !isDockerBridgeAddress(address))
}

// Splits the configured addresses, dropping anything that is not one so a typo cannot be advertised
function parseLanIps(configured: unknown): string[] {
  if (typeof configured !== 'string') {
    return []
  }

  return configured
    .split(',')
    .map((address) => address.trim())
    .filter((address) => net.isIP(address) !== 0)
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
