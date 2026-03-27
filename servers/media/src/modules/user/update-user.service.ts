import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { User } from './user.entity'
import { UserService } from './user.service'
import { UpdateUserDto } from './dtos/UpdateUser.dto'
import { SeatsService } from './seats.service'

/**
 * Update different user fields.
 */
@Injectable()
export class UpdateUserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly userService: UserService,
    private readonly seatsService: SeatsService,
  ) {}

  /**
   * Update a user after validating each field that is about to be updated.
   */
  async validateAndUpdate(
    updatingUser: User,
    currentUser: User,
    updateUserDto: Partial<User>,
  ): Promise<User | null> {
    const validationResults = await Promise.allSettled(Object.keys(updateUserDto).map((propertyToUpdate) => {
      // Whitelist of user fields that can be updated
      switch (propertyToUpdate) {
        case 'enabled':
          return this.validateEnabledChange(updatingUser, currentUser, updateUserDto)
        case 'password':
          return this.validatePasswordChange(updatingUser, currentUser, updateUserDto)
        case 'activityStatus':
        case 'activityStatusUpdatedAt':
          return Promise.resolve(true)
        default:
          return Promise.reject(`Invalid property: ${propertyToUpdate}`)
      }
    }))

    if (validationResults.find((res) => res.status === 'rejected')) {
      const msg = validationResults
        .filter((res) => res.status === 'rejected')
        .map((res) => res.reason)
        .join(', ')
      throw new Error(msg)
    }

    try {
      return await this.updateUser(updatingUser, updateUserDto)
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  /**
   * Validate the change to the "enabled" field.
   */
  private async validateEnabledChange(
    updatingUser: User,
    currentUser: User,
    updateUserDto: UpdateUserDto,
  ): Promise<boolean> {
    const serverOwner = await this.userService.getServerOwner()

    // Server owner cannot be disabled by anyone
    if (updateUserDto?.enabled === false && updatingUser.userId === serverOwner?.userId) {
      throw new Error('This user cannot be disabled.')
    }

    // If trying to enable a cloud user, check if there is a seat available
    if (
      (updateUserDto?.enabled === true && updatingUser.enabled === false)
      && updatingUser.cardinalId
    ) {
      if (!await this.seatsService.hasAvailableSeats()) {
        throw new Error('Cannot enable this user because there are no seats available.')
      }
    }

    if (updatingUser.userId === currentUser.userId && updateUserDto.enabled === false) {
      throw new Error('You cannot disable yourself.')
    }

    return true
  }

  /**
   * Validate the change to the "password" field.
   */
  private async validatePasswordChange(
    updatingUser: User,
    currentUser: User,
    updateUserDto: UpdateUserDto,
  ): Promise<boolean> {
    // Empty strings are allowed
    if (typeof updateUserDto?.password !== 'string') {
      throw new Error('Missing password')
    }

    return true
  }

  /**
   * Actually update a user.
   */
  private async updateUser(user: User, data: Partial<User>): Promise<User | null> {
    try {
      Object.keys(data).forEach((propertyToUpdate) => {
        user[propertyToUpdate] = data[propertyToUpdate]
      })
      // We must trigger TypeORM hooks
      await this.userRepository.save(user)
      return await this.userRepository.findOne({ where: { userId: user.userId } })
    } catch (error) {
      Logger.log(error)
      return null
    }
  }
}
