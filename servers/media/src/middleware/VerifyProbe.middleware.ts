import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction } from 'express'

import { verifyProbeHeader } from '@cardinalapps/remote-access'

import { DatabaseService } from '../modules/database/database.service'
import { OPTIONS } from '../utils/options'

/**
 * Verifies the HMAC-signed reachability probes that the Remote Access Server
 * sends to `/api/ping`. Sets `request.isValidProbe` on success, otherwise
 * `request.isInvalidProbe`; the ping controller turns the latter into a 404 so
 * unauthenticated callers can't tell the endpoint exists.
 *
 * Never throws — any malformed input or missing configuration reads as an
 * invalid probe.
 */
@Injectable()
export class VerifyProbe implements NestMiddleware {
  constructor(private readonly databaseService: DatabaseService) {}

  async use(request, response, next: NextFunction): Promise<void> {
    if (request.headers['x-cardinal-probe'] !== '1') {
      request.isInvalidProbe = true
      return next()
    }

    const signatureHeader = request.headers['x-cardinal-probe-signature']
    const signingKeyBase64 = signatureHeader
      ? await this.databaseService.getOption(OPTIONS.CONNECT_SIGNING_KEY.name)
      : null

    if (!signatureHeader || typeof signatureHeader !== 'string' || !signingKeyBase64) {
      request.isInvalidProbe = true
      return next()
    }

    try {
      const signingKey = new Uint8Array(Buffer.from(signingKeyBase64 as string, 'base64'))
      const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)
      const valid = await verifyProbeHeader(signingKey, instanceId as string, signatureHeader, new Date())

      if (valid) {
        request.isValidProbe = true
      } else {
        request.isInvalidProbe = true
      }
    } catch {
      request.isInvalidProbe = true
    }

    next()
  }
}
