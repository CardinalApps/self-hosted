import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import {
  SUBSCRIPTIONS,
  SubscriptionTier,
} from '@cardinalapps/products/dist/cjs/subscriptions'

import { User } from '../user/user.entity'
import { UserService } from '../user/user.service'

/**
 * This service handles licensing related logic.
 */
@Injectable()
export class LicensingService {
  constructor(
    @InjectRepository(User)
    private userService: UserService,
  ) {}

  /**
   * Returns the currently applicable server license, which is determined by the
   * subscription tier of the owner. Defaults to Free if there is no owner.
   */
  async getServerLicense(): Promise<SubscriptionTier> {
    const owner = await this.userService.getServerOwner()

    if (!owner) {
      return SUBSCRIPTIONS['free']
    }

    const ownerSubscription = owner?.cachedCloudUser?.subscription

    if (ownerSubscription) {
      return ownerSubscription
    } else {
      throw new Error('Could not determine license')
    }
  }
}
