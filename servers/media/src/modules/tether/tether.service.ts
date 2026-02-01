import { Injectable } from '@nestjs/common'

import { EventService } from '../event/event.service'
import { UserService } from '../user/user.service'
import { UserEvents } from '../user/events'
import { DatabaseService } from '../database/database.service'
import { OPTIONS } from '../../utils/options'

@Injectable()
export class TetherService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventService: EventService,
    private readonly userService: UserService,
  ) {
    this.eventService.subscribePrivate(this, UserEvents.CREATE_OWNER, this.registerServerIfNotRegistered.bind(this))
    this.registerServerIfNotRegistered()
  }

  /**
   * When this server is claimed by a Cardinal cloud account, attempt to
   * register it with Cardinal's cloud. This allows the user to see the server
   * in the account portal.
   */
  async registerServerIfNotRegistered(): Promise<void> {
    // If the server is unclaimed, do not attempt to register it
    const owner = await this.userService.getServerOwner()
    if (!owner) {
      return
    }

    const alreadyRegistered = await this.databaseService.getOption(OPTIONS.REGISTRATION_ID)
    if (alreadyRegistered) {
      return
    }
  }
}
