import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction } from 'express'

import { AuthService } from '../modules/auth/auth.service'
import { UserService } from '../modules/user/user.service'

/**
 * This middleware reads the request and updates the activityStatus for each
 * active user.
 * 
 * This should run after the JWT middlewares.
 */
@Injectable()
export class UserActivity implements NestMiddleware {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  async use(request, response, next: NextFunction): Promise<void> {
    if (request?.user) {
      await this.userService.update(request.user.userId, {
        activityStatus: 'seen', // TODO make this client-supplied
        activityStatusUpdatedAt: new Date(),
      })
    }

    next()
  }
}
