import { Reflector } from '@nestjs/core'
import { MediaServerCapability } from '@cardinalapps/access-control/dist/cjs'

/**
 * Used to set which capabilities are required on the endpoint. They will be
 * valided by the CapabilitiesGuard.
 */
export const Capabilities = Reflector.createDecorator<MediaServerCapability[]>()
