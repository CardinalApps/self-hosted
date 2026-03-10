import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Not, Repository } from 'typeorm'

import { User } from './user.entity'
import { UserService } from './user.service'

/**
 * This service handles all things related to managing user seats.
 * 
 * To qualify as a seated user, the user must meet this criteria:
 * 
 *    - Uses a Cardinal cloud account.
 *    - The account is enabled in this server.
 */
@Injectable()
export class SeatsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  /**
   * Returns an array of all users that are using a seat.
   */
  async getSeatedUsers(): Promise<User[]> {
    const seatedUsers = await this.userRepository.find({
      where: {
        cardinalId: Not(IsNull()),
        enabled: true,
      },
    })
    return seatedUsers
  }

  /**
   * Returns the number of users that are using seats.
   */
  async countSeatedUsers(): Promise<number> {
    const seatedUsers = await this.userRepository.count({
      where: {
        cardinalId: Not(IsNull()),
        enabled: true,
      },
    })
    return seatedUsers
  }

  /**
   * Returns whether there are any seats available according to the server
   * owner's subscription tier.
   */
  async hasAvailableSeats(): Promise<boolean> {
    const numSeated = await this.countSeatedUsers()
    const ownerSubscription = await this.userService.getServerOwnerSubscription()

    return numSeated < ownerSubscription.provides.seats
  }
}
