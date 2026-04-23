import { Injectable, NestMiddleware, GoneException } from '@nestjs/common'
import { NextFunction, Response } from 'express'

/**
 * When a user presents themselves with a valid JWT, but their account is disabled, revoke their session.
 */
@Injectable()
export class RevokeDisabledUserSessions implements NestMiddleware {
  constructor() {}

  async use(request, response: Response, next: NextFunction): Promise<void> {
    if (request.user && request.user?.enabled === false) {
      response.header('Cardinal-Extra-Message', 'Your account has been disabled on this server, contact the server owner for help.')
      throw new GoneException()
    }

    next()
  }
}
