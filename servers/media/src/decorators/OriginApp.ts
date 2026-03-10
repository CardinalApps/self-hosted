import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { CardinalApp as CardinalAppNames } from '../utils/apps'

/**
 * Returns the name of the client app from which the request originates. This
 * value is set by the client app, so trust is cautiously.
 */
export const OriginApp = createParamDecorator(
  (data: string, ctx: ExecutionContext): CardinalAppNames => {
    const request = ctx.switchToHttp().getRequest()
    const app: CardinalAppNames = request.cardinalApp
    return app ? app : undefined
  },
)
