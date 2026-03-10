import { Injectable, Logger } from '@nestjs/common'

import { EventService } from '../event/event.service'
import { UserService } from '../user/user.service'
import { DatabaseService } from '../database/database.service'
import { OPTIONS } from '../../utils/options'
import { authAPI } from '../../utils/cloud'
import { SettingsService } from '../settings/settings.service'
import { CardinalApp } from '../../utils/apps'
import { CreateOwnerEventPayload, UserEvents } from '../user/events'

type ClaimRes = {
  claimId: string,
  claimedAt: string,
}

@Injectable()
export class ClaimService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly settingsService: SettingsService,
    private readonly eventService: EventService,
    private readonly userService: UserService,
  ) {
    this.eventService.subscribePrivate(this, UserEvents.CREATE_OWNER, this.claimServerWithCloudIfNotClaimed.bind(this))
  }

  /**
   * Propagate the local claim to Cardinal's cloud. This will allow the user to
   * see the server in their account portal.
   * 
   * This is async so as not to block any local actions if the cloud is
   * unreachable.
   */
  async claimServerWithCloudIfNotClaimed(options?: CreateOwnerEventPayload): Promise<void> {
    // Server must have an owner
    const owner = await this.userService.getServerOwner()
    if (!owner) {
      return
    }

    // And it must not already be claimed
    const alreadyClaimed = await this.databaseService.getOption(OPTIONS.CLAIM_ID.name)
    if (alreadyClaimed) {
      return
    }

    const instanceId = await this.databaseService.getOption(OPTIONS.INSTANCE_ID.name)

    // The serverName will be given in the options during First Time Setup
    const serverName = options?.serverName
      ? options.serverName
      : await this.settingsService.get(CardinalApp.ADMIN, 'server_name')

    authAPI<ClaimRes>('/user/claims', 'POST', {
      body: {
        // Cardinal Admin app ID
        ssoAppId: '0d55d632-3517-4b1e-920e-448d6b77b8bf',
        appNameSetByUser: serverName as string,
        instanceId: instanceId as string,
        origin: instanceId as string,
      },
      JWT: options.jwt,
    })
      .then((res) => {
        this.saveClaim(res)
      })
      .catch((err) => {
        Logger.warn(`Failed to claim ownership of this server with Cardinal Cloud: ${err}`, 'Claim')
      })
  }

  /**
   * Saves the claim result from the cloud.
   */
  async saveClaim(res: ClaimRes): Promise<void> {
    if (!res.claimId) {
      Logger.error('Cardinal cloud did not return claim ID', 'Claim')
      return
    }

    if (!res.claimedAt) {
      Logger.error('Cardinal cloud did not return claim date', 'Claim')
      return
    }

    try {
      await this.databaseService.saveOption(OPTIONS.CLAIM_ID.name, res.claimId)
      await this.databaseService.saveOption(OPTIONS.CLAIMED_AT.name, res.claimedAt)
      Logger.log('Successfully claimed this Media Server instance with Cardinal cloud; see your claims at account.cardinalapps.io/account/claims', 'Claim')
    } catch (err) {
      Logger.log(err, 'Claim')
    }
  }
}
