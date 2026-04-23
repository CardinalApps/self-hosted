import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as ms from 'ms'

import { getJWTPayload } from '../../utils/jwt'

import { UserService } from '../user/user.service'
import { SettingsService } from '../settings/settings.service'
import { CardinalApp } from '../../utils/apps'

const SESSION_TIMEOUT_TO_MS: Record<string, number | null> = {
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

@Injectable()
export class TokenService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly settingsService: SettingsService,
  ) {}

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
    const expiresIn = timeout === 'session' ? '30d' : timeout

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

  /**
   * Verifies a refresh token and returns its payload. Returns null for anything
   * invalid or expired.
   */
  verifyRefreshToken(token: string): { uid: string } | null {
    try {
      const result = this.jwtService.verify(token)
      if (typeof result === 'object' && result.type === 'refresh' && 'uid' in result) {
        return result as { uid: string }
      }
      return null
    } catch {
      return null
    }
  }
}
