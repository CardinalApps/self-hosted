import { Injectable, NestMiddleware, GoneException } from '@nestjs/common'
import { NextFunction } from 'express'

import { Designations } from '../modules/user/types'
import { UserService } from '../modules/user/user.service'

import { getJWTFromHeaders } from '../utils/jwt'

/**
 * Revokes active guest sessions when the option to allow guest accounts is
 * disabled.
 */
@Injectable()
export class RevokeGuestSession implements NestMiddleware {
  constructor(
    private readonly userService: UserService,
  ) {}

  async use(request, response, next: NextFunction): Promise<void> {
    const localUserJWT = getJWTFromHeaders(request.headers)

    if (localUserJWT && request.user?.designation === Designations.GUEST_ACCOUNT) {
      const guestAccountIsEnabled = await this.userService.guestAccountIsEnabled()

      if (!guestAccountIsEnabled) {
        throw new GoneException()
      }

      return next()
    }

    next()
  }
}
