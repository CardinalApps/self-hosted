import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { NextFunction } from 'express'

import { AuthService } from '../modules/auth/auth.service'
import { UserService } from '../modules/user/user.service'
import { CloudUserService } from '../modules/user/cloud-user.service'

import { getCardinalTolkienFromHeaders } from '../utils/jwt'

/**
 * This middleware reads the cloud user JWT in the CardinalTolkien header and
 * verifies the token if one is present. The verification is done with
 * Cardinal's auth servers in the cloud.
 * 
 * The response from the cloud servers will contain the user object, and that
 * object will be cached in the database for a certain amount of time. This is
 * to reduce the amount of traffic that hits the auth servers, and to allow the
 * the Media Server to function with *online* local accounts on the local area
 * network without any internet access.
 * 
 * This depends on the local user JWT middleware running first.
 */
@Injectable()
export class AttachCloudUserToRequest implements NestMiddleware {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly cloudUserService: CloudUserService,
  ) {}

  async use(request, response, next: NextFunction): Promise<void> {
    const cloudUserJWT = getCardinalTolkienFromHeaders(request.headers)

    // The token is optional
    if (!cloudUserJWT) {
      return next()
    }

    // Cloud tokens require a local token to have already validated and attached
    // to the request
    if (!request?.user) {
      return next()
    }

    //const payload = getJWTPayload(cloudUserJWT)

    // It must be a SSO token
    // if (payload?.sso !== true) {
    //   Logger.error(`Invalid Cardinal token. ${helpCode('0012')}`, 'CloudUserMiddleware')
    //   return next()
    // }

    const linkedLocalUser = await this.userService.getUserByCardinalJWT(cloudUserJWT)

    // There is no local account with this JWT
    if (!linkedLocalUser) {
      // If this server already has a server owner, disallow this unknown JWT
      const serverOwner = await this.userService.getServerOwner()
      if (serverOwner) {
        Logger.error('This Media Server has already been claimed by a different Cardinal account')
        return next()
      }
    }

    // A local user is linked with this cloud Cardinal account
    if (linkedLocalUser && linkedLocalUser.cachedCloudUser) {
      request.cardinalUser = linkedLocalUser.cachedCloudUser
      return next()
    }

    next()
  }
}
