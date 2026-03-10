import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request } from 'express'

import { DatabaseService } from '../modules/database/database.service'
import { OPTIONS } from '../utils/options'
import { SettingsService } from '../modules/settings/settings.service'
import { CardinalApp } from '../utils/apps'
import { ClaimService } from '../modules/claim/claim.service'
import { CreateOwnerEventPayload } from '../modules/user/events'
import { getCardinalTolkienFromHeaders } from '../utils/jwt'

/**
 * This middleware checks if the server has an owner, but has not been claimed.
 * This can happen if the claim fails for any reason during First Time Setup.
 * 
 * When this state is detected, the claim will be retried. This is done in with
 * a middleware because we need to forward the owners JWT.
 */
@Injectable()
export class MaybeTriggerClaim implements NestMiddleware {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly settingsService: SettingsService,
    private readonly claimService: ClaimService,
  ) {}

  async use(request: Request, response, next: NextFunction): Promise<void> {
    const opt = await this.databaseService.getOption(OPTIONS.CLAIM_ID.name)
    if (!opt) {
      const cloudJWT = getCardinalTolkienFromHeaders(request.headers)
      if (cloudJWT) {
        const serverName = await this.settingsService.get(CardinalApp.ADMIN, 'server_name')
        // Do not await
        this.claimService.claimServerWithCloudIfNotClaimed({
          serverName,
          jwt: cloudJWT,
        } as CreateOwnerEventPayload)
      }
    }

    next()
  }
}
