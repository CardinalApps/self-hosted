import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

import { log, LogModule, LogLevel } from '../utils/logging'

@Injectable()
export class HTTPLoggerMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const { hostname, method, baseUrl } = request

    response.on('close', () => {
      const { statusCode } = response
      log(LogModule.HTTP, LogLevel.INFO, `${statusCode} [${hostname}] ${method} ${baseUrl}`)
    })

    next()
  }
}
