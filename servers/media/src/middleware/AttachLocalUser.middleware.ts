import { Injectable, NestMiddleware, Logger, GoneException } from '@nestjs/common'
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

    const tokenIsValid = this.tokenService.verifyJWT(localUserJWT)

    // The token will become invalid when the server secret is changed
    if (!tokenIsValid) {
      Logger.warn(`Invalid JWT: ${localUserJWT}`)
      // Force the client app to log out
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
