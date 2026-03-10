import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction } from 'express'

/**
 * If the client sends a header called `cardina-app` then this will attach it to
 * the request object.
 */
@Injectable()
export class AttachOriginApp implements NestMiddleware {
  constructor() {}

  async use(request, response, next: NextFunction): Promise<void> {
    const app = request.headers?.['cardinal-app']

    if (app) {
      request.cardinalApp = app
    }

    next()
  }
}
