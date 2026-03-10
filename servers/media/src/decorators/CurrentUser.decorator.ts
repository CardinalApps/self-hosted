import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { User } from '../modules/user/user.entity'

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest()
    const user: User = request.user

    return data ? user?.[data] : user
  },
)
