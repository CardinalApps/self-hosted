import { Injectable, NestMiddleware, Logger, GoneException, UnauthorizedException } from '@nestjs/common'
import { NextFunction } from 'express'

import { UserService } from '../modules/user/user.service'
import { TokenService } from '../modules/auth/token.service'

import { getJWTFromHeaders } from '../utils/jwt'

/**
 * This middleware reads the JWT in the Authorization header and verifies the
 * token if one is present. If the token is valid, the associated local user
 * will be loaded from the database and attached to the request object.
 *
 * If the client app is sending a legit token, but it doesn't map to an existing
 * user, assume that the user was deleted server-side and the client app now has
 * a stale session. This can easily happen during a factory reset.
 *
 * Expired tokens return 401 so the client can attempt a refresh. Tokens that
 * fail signature verification return 410 to force a full logout (signing secret
 * was rotated or the token was tampered with).
 */
@Injectable()
export class AttachLocalUserToRequest implements NestMiddleware {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async use(request, response, next: NextFunction): Promise<void> {
    const localUserJWT = getJWTFromHeaders(request.headers)

    // The token is optional
    if (!localUserJWT) {
      return next()
    }

    const tokenStatus = this.tokenService.verifyAccessToken(localUserJWT)

    if (tokenStatus === 'expired') {
      // Tell the client to refresh — do not force a full logout
      throw new UnauthorizedException('Token expired')
    }

    if (tokenStatus === 'invalid') {
      // Signing secret changed or token tampered — force client logout
      Logger.warn(`Invalid JWT: ${localUserJWT}`)
      throw new GoneException()
    }

    const user = await this.userService.getUserByLocalJWT(localUserJWT)

    // Token is valid but user doesn't exist server-side.
    // Client apps will force a logout and clear their local data when they get this.
    if (!user) {
      throw new GoneException()
    }

    request.user = user

    next()
  }
}
