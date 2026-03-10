import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common'

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

    const attachedUser = request?.user?.userId

    if (!attachedUser) {
      return false
    }

    // Verify offline user
    if (!attachedUser?.cardinalId) {
      // The offline user only needs to have a user ID
      return !!request?.user?.userId
    }
    // Verify online user
    else {
      // The online user must have a cached user object in the request
      return !!request?.cardinalUser
    }
  }
}
