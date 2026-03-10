import {
  Injectable,
  CanActivate,
  ExecutionContext,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Capabilities } from '../decorators/Capabilities.decorator'
import { getMediaServerRole, hasCapabilities, MediaServerCapability } from '@cardinalapps/access-control/dist/cjs'

/**
 * Ensures that the currently logged in user roles satisfy ALL of the
 * capabilities given to the @Capabilties() decorator.
 */
@Injectable()
export class CapabilitiesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const capabilities = this.reflector.get<MediaServerCapability[]>(Capabilities, context.getHandler())

    if (!capabilities) {
      throw new InternalServerErrorException(`CapabilitiesGuard requires setting the @Capabilities() decorator on field ${context.getHandler().name}`)
    }

    const request = context.switchToHttp().getRequest()
    const userRoles = request?.user?.roles

    if (!userRoles) {
      throw new ForbiddenException()
    }

    return hasCapabilities<MediaServerCapability>(capabilities, userRoles?.flatMap((role) => getMediaServerRole(role.role).capabilities))
  }
}
