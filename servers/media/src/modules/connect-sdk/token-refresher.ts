import { Injectable, Logger } from '@nestjs/common'
import jwtDecode from 'jwt-decode'
import { fetchAuthAPI, MixedAppEnv } from '@cardinalapps/topology/dist/cjs'

import { DatabaseService } from '../database/database.service'
import { OPTIONS } from '../../utils/options'
import { getCurrentMode } from '../../utils/env'
import { outboundHeaders } from '../../utils/cloud'

// How much lifetime an access token must have left to be reused
const REFRESH_THRESHOLD_MS = 10 * 60 * 1000

/**
 * The cloud IDP has definitively rejected the stored server token (revoked or
 * expired). Callers must disable Remote Access and wait for the user to
 * re-enable it — retrying cannot help. Transient failures (cloud unreachable,
 * 5xx) throw plain Errors instead.
 */
export class ConnectAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConnectAuthError'
  }
}

/**
 * Holds the short-lived cloud access token used to authenticate the WSS
 * control channel, minting a fresh one from the stored long-lived server
 * token whenever less than 10 minutes remain.
 */
@Injectable()
export class TokenRefresher {
  private accessToken: string | null = null

  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Returns a cloud access token with at least 10 minutes of life left,
   * refreshing via the cloud IDP when needed.
   */
  async getCurrentToken(): Promise<string> {
    if (this.accessToken && this.expiresInMs(this.accessToken) > REFRESH_THRESHOLD_MS) {
      return this.accessToken
    }

    return await this.refresh()
  }

  /**
   * Returns the expiry of the stored long-lived server token, or null when
   * none is stored or it does not decode.
   */
  async getServerTokenExpiry(): Promise<Date | null> {
    const serverToken = await this.databaseService.getOption(OPTIONS.CONNECT_SERVER_TOKEN.name)

    if (!serverToken) {
      return null
    }

    try {
      const { exp } = jwtDecode<{ exp: number }>(serverToken as string)
      return new Date(exp * 1000)
    } catch {
      return null
    }
  }

  /**
   * Drops the cached access token, forcing a refresh on the next request.
   */
  clear(): void {
    this.accessToken = null
  }

  /**
   * Exchanges the stored server token for a fresh access token.
   */
  private async refresh(): Promise<string> {
    const serverToken = await this.databaseService.getOption(OPTIONS.CONNECT_SERVER_TOKEN.name)

    if (!serverToken) {
      throw new ConnectAuthError('No Remote Access server token is stored. Enable Remote Access in the Admin app.')
    }

    let response
    try {
      response = await fetchAuthAPI<Response>('/auth/server-refresh', 'POST', getCurrentMode() as MixedAppEnv, {
        headers: outboundHeaders(),
        body: { token: serverToken as string },
        returnRawResponse: true,
      })
    } catch (err) {
      throw new Error(`Cloud IDP unreachable while refreshing the Remote Access token: ${err}`)
    }

    if (response.status === 401) {
      throw new ConnectAuthError('The Remote Access server token was rejected by the cloud IDP (revoked or expired).')
    }

    if (response.status !== 200) {
      throw new Error(`Cloud IDP returned ${response.status} while refreshing the Remote Access token`)
    }

    const body = await response.json().catch(() => null)

    if (!body?.JWT) {
      throw new Error('Cloud IDP did not return a token while refreshing the Remote Access token')
    }

    Logger.debug('Refreshed the Remote Access cloud access token', 'ConnectSDK')
    this.accessToken = body.JWT

    return body.JWT
  }

  // ms until the given JWT expires; 0 for undecodable tokens
  private expiresInMs(token: string): number {
    try {
      const { exp } = jwtDecode<{ exp: number }>(token)
      return exp * 1000 - Date.now()
    } catch {
      return 0
    }
  }
}
