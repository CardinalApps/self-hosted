import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction } from 'express'

import { PopularityService } from '../modules/popularity/popularity.service'

import { getCardinalTolkienFromHeaders } from '../utils/jwt'

/**
 * Lets cloud-authenticated requests opportunistically donate their in-flight
 * cloud JWT to the Popularity Data Pool sender. The Media Server deliberately
 * never stores cloud tokens at rest, so borrowing one mid-request is the only
 * way cloud-bound traffic can be authenticated.
 *
 * This depends on AttachCloudUserToRequest having run first.
 */
@Injectable()
export class SendPopularityBatch implements NestMiddleware {
  constructor(private readonly popularityService: PopularityService) {}

  use(request, response, next: NextFunction): void {
    const cloudUserJWT = getCardinalTolkienFromHeaders(request.headers)

    if (cloudUserJWT && request?.cardinalUser) {
      // Fire-and-forget; never delays the request
      this.popularityService.maybeSend(cloudUserJWT, request.cardinalUser)
    }

    next()
  }
}
