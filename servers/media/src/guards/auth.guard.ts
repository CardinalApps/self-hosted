import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'

import { AUTH_ERROR_CODE } from '../modules/auth/types'

/**
 * Ensures that the request object has a local user object and/or a cloud user
 * object. If they exist, then they have been validated and attached by the
 * middleware.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    if (!request) {
      throw new Error('Could not get request context.')
    }

    const attachedUser = request?.user

    if (!attachedUser?.userId) {
      throw new UnauthorizedException()
    }

    // An offline user answers to this server alone
    if (!attachedUser.cardinalId) {
      return true
    }

    /* An online user is let through on the cached copy of their cloud account as readily as on a
       cloud token verified this request. The cache is what lets these accounts keep working on a
       LAN with no route to the internet, so only an account with neither is turned away. */
    if (request?.cardinalUser || attachedUser.cachedCloudUser) {
      return true
    }

    throw new UnauthorizedException({
      code: AUTH_ERROR_CODE.CLOUD_TOKEN_REQUIRED,
      message: 'This account is linked to a Cardinal account, which must be signed in at least once.',
    })
  }
}
