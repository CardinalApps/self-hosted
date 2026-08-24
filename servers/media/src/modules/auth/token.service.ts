import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as ms from 'ms'

import { getJWTPayload } from '../../utils/jwt'
import { OPTIONS } from '../../utils/options'

import { UserService } from '../user/user.service'
import { SettingsService } from '../settings/settings.service'
import { DatabaseService } from '../database/database.service'
import { CardinalApp } from '../../utils/apps'
import { buildRefreshCookieName } from './refresh-cookie'

const SESSION_TIMEOUT_TO_MS: Record<string, number | null> = {
  'memory': null,
  'session': null,
  '15m': ms('15m'),
  '1h': ms('1h'),
  '12h': ms('12h'),
  '1d': ms('1d'),
  '3d': ms('3d'),
  '7d': ms('7d'),
  '14d': ms('14d'),
  '30d': ms('30d'),
}

/*
 * A refresh tolkien this server signed is one it may act on, including clearing the cookie it came
 * in. A tolkien it did not sign belongs to another server sharing the host's cookie jar.
 */
export type RefreshTokenVerification =
  | { outcome: 'valid', payload: { uid: string } }
  | { outcome: 'expired' }
  | { outcome: 'invalid' }
  | { outcome: 'foreign' }

@Injectable()
export class TokenService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly settingsService: SettingsService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Returns the name this server stores its refresh tolkien cookie under. Read
   * fresh every time because a factory reset issues a new instance ID without
   * restarting the process.
   */
  async getRefreshCookieName(): Promise<string> {
    const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)

    return buildRefreshCookieName(instanceId as string)
  }

  /**
   * Returns the current inactive_session_timeout setting value (e.g. '7d').
   * Falls back to '7d' if the setting is missing or unrecognised.
   */
  async getSessionTimeout(): Promise<string> {
    const value = await this.settingsService.get(CardinalApp.ADMIN, 'inactive_session_timeout') as string
    return value in SESSION_TIMEOUT_TO_MS ? value : '7d'
  }

  /**
   * Returns the cookie maxAge in milliseconds for the current session timeout
   * setting. Returns null for the 'session' option (session cookie — no maxAge).
   */
  async getRefreshCookieMaxAge(): Promise<number | null> {
    const timeout = await this.getSessionTimeout()
    return SESSION_TIMEOUT_TO_MS[timeout]
  }

  /**
   * Issues a short-lived access token (15 minutes). This is the token clients
   * store in localStorage and attach to every API request.
   */
  async createAccessToken(userId: string, cardinalAccessToken?: string): Promise<string | null> {
    const user = await this.userService.get(userId)

    if (!user) {
      Logger.warn('Invalid user ID', 'Auth')
      return null
    }

    const cardinalJWTPayload = cardinalAccessToken ? getJWTPayload(cardinalAccessToken) : null

    return this.jwtService.sign(
      {
        uid: user.userId,
        role: user.role,
        designation: user.designation,
        cardinalId: cardinalJWTPayload ? cardinalJWTPayload.userId : null,
        type: 'access',
      },
      { expiresIn: '15m' },
    )
  }

  /**
   * Issues a long-lived refresh token whose lifetime matches the
   * inactive_session_timeout admin setting.
   */
  async createRefreshToken(userId: string): Promise<string | null> {
    const user = await this.userService.get(userId)

    if (!user) {
      Logger.warn('Invalid user ID', 'Auth')
      return null
    }

    const timeout = await this.getSessionTimeout()
    const expiresIn = (timeout === 'session' || timeout === 'memory') ? '30d' : timeout

    return this.jwtService.sign(
      {
        uid: user.userId,
        type: 'refresh',
      },
      { expiresIn },
    )
  }

  /**
   * Alias for createAccessToken. Retained for backwards compatibility with
   * callers that predate the dual-token auth upgrade.
   */
  async createJWT(userId: string, cardinalAccessToken?: string): Promise<string | null> {
    return this.createAccessToken(userId, cardinalAccessToken)
  }

  /**
   * Distinguishes expired tokens from tampered ones so the middleware can
   * return the right status code: 401 for expired (client should refresh),
   * 410 for invalid (force logout — signing secret changed or token was forged).
   */
  verifyAccessToken(JWT: string): 'valid' | 'expired' | 'invalid' {
    try {
      const result = this.jwtService.verify(JWT)
      if (typeof result === 'object' && result.type === 'access' && 'uid' in result) return 'valid'
      return 'invalid'
    } catch (error) {
      if (error?.name === 'TokenExpiredError') return 'expired'
      return 'invalid'
    }
  }

  /*
   * Verifies a refresh token, separating this server's own bad tokens from tokens it never signed.
   * jsonwebtoken checks the signature before the claims, so a TokenExpiredError proves the token is
   * ours; every other failure leaves that unproven and counts as foreign.
   */
  verifyRefreshToken(token: string): RefreshTokenVerification {
    try {
      const result = this.jwtService.verify(token)

      if (typeof result === 'object' && result.type === 'refresh' && 'uid' in result) {
        return { outcome: 'valid', payload: result as { uid: string } }
      }

      return { outcome: 'invalid' }
    } catch (error) {
      if (error?.name === 'TokenExpiredError') return { outcome: 'expired' }
      if (error?.name === 'NotBeforeError') return { outcome: 'invalid' }
      return { outcome: 'foreign' }
    }
  }
}
