import {
  Controller,
  Get,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'

import { UserService } from './user.service'
import { SeatsService } from '../user/seats.service'

import { SubscriptionTier } from '@cardinalapps/products/dist/cjs/subscriptions'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller('/licensing')
@ApiTags('Licensing')
export class LicensingController {
  constructor(
    private readonly userService: UserService,
    private readonly seatsService: SeatsService,
  ) {}

  /**
   * Get the current Cardinal subcription tier for this server.
   */
  @Get('/subscription')
  @StandardEndpoint({
    summary: 'Get the subscription tier.',
    capabilities: ['Users.Read'],
  })
  async getCurrentSubscription(): Promise<SubscriptionTier> {
    return await this.userService.getServerOwnerSubscription()
  }

  /**
   * Returns information about the current number of seats and how many have
   * been used.
   */
  @Get('/seats')
  @StandardEndpoint({
    summary: 'Get information about seat usage.',
    capabilities: ['Users.Read'],
  })
  async getSeats(): Promise<{ used: number, total: number }> {
    const subscription = await this.userService.getServerOwnerSubscription()
    const usedSeats = await this.seatsService.countSeatedUsers()
    return {
      total: subscription.provides.seats,
      used: usedSeats,
    }
  }
}
