import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, IsNull, Not, Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import * as ms from 'ms'

import SUBSCRIPTIONS, { getSubscription, SubscriptionTier } from '@cardinalapps/products/dist/cjs/subscriptions'

import { v4 as uuid } from 'uuid'

import { getJWTPayload, CloudUserJWTPayload, LocalUserJWTPayload } from '../../utils/jwt'
import { SettingsService } from '../settings/settings.service'

import { LocalUserService } from './local-user.service'
import { CloudUserService } from './cloud-user.service'
import { User } from './user.entity'
import { Designations } from './types'
import { CreateUser } from './dtos/CreateUser.dto'
import { GetUsersDto } from './dtos/GetUsers.dto'
import { SeatsService } from './seats.service'
import { RBACService } from '../rbac/rbac.service'
import { EventService } from '../event/event.service'
import { CreateOwnerEventPayload, UserEvents } from './events'

type CreateUserArgs = {
  dto?: CreateUser,
  // Only the backend should set secure args
  secure?: {
    designation?: Designations,
  },
}

/**
 * This class harmonizes the features of offline and online accounts.
 */
@Injectable()
export class UserService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly localUserService: LocalUserService,
    private readonly cloudUserService: CloudUserService,
    private readonly settingsService: SettingsService,
    private readonly seatsService: SeatsService,
    private readonly rbacService: RBACService,
    private readonly eventService: EventService,
  ) {}

  /**
   * When Nest starts up.
   */
  async onModuleInit(): Promise<void> {
    if (!await this.getGuestAccount()) {
      await this.createGuestAccount()
      Logger.log('Created guest account', 'User')
    }
  }

  /**
   * Creates a new local user. If a Cardinal JWT is given, the cloud account
   * will be validated.
   */
  async createUser(args: CreateUserArgs): Promise<User | null> {
    const {
      dto,
      secure,
    } = args
    let cardinalCloudUser

    // Fetch the user from the auth servers for this JWT and validate it
    if (dto?.cardinalJWT) {
      cardinalCloudUser = await this.cloudUserService.getCardinalCloudUser(dto.cardinalJWT)
      this.cloudUserService.throwIfInvalidCardinalAccount(cardinalCloudUser)
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const newUserInstance = this.userRepository.create({
        userId: uuid(),
        cardinalId: cardinalCloudUser ? cardinalCloudUser.userId : null,
        cachedCloudUser: cardinalCloudUser ? cardinalCloudUser : null,
        cachedCloudUserAt: cardinalCloudUser ? new Date() : null,
        designation: secure?.designation || null,
        username: dto.username || null,
        password: dto.password,
      })
      const createdUser = await queryRunner.manager.save(newUserInstance)

      const roleAssignments = dto?.role
        ? await this.rbacService.assignRole(dto.role, [createdUser], queryRunner)
        : undefined

      await queryRunner.commitTransaction()

      Logger.log(`Created new local user [userId=${createdUser.userId}] [role=${roleAssignments[0].role}]`, 'User')

      // Return with roles
      return await this.getUserByLocalId(createdUser.userId)
    } catch (error) {
      await queryRunner.rollbackTransaction()
      Logger.error(`Could not create local user`, 'User')
      Logger.error(error)
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Creates the guest account.
   */
  async createGuestAccount(): Promise<User | null> {
    if (await this.getGuestAccount()) {
      throw new Error('Cannot create multiple Guest accounts')
    }

    try {
      const guestAccount = await this.createUser({
        dto: { role: 'administrator' },
        secure: { designation: Designations.GUEST_ACCOUNT },
      })

      return guestAccount
    } catch (error) {
      Logger.error(error)
      return null
    }
  }

  /**
   * Deletes the guest account.
   */
  async deleteGuestAccount(): Promise<boolean> {
    try {
      const guestAccount = await this.getGuestAccount()
      await this.userRepository.delete({ id: guestAccount.id })
      return true
    } catch (e) {
      Logger.error(e)
      return false
    }
  }

  /**
   * Recreate the guest account.
   */
  async recreateGuestAccount(): Promise<User | false> {
    try {
      const guestAccount = await this.getGuestAccount()
      if (guestAccount) {
        await this.deleteGuestAccount()
      }
      const newGuestAccount = await this.createGuestAccount()
      Logger.log('Recreated guest account.', 'User')
      return newGuestAccount
    } catch (e) {
      Logger.error(e)
      return false
    }
  }

  /**
   * Returns the local user that matches the given user ID.
   */
  async get(userId: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ userId })
  }

  /**
   * Creates the server owner account.
   */
  async createServerOwner(cardinalSSOJWT, serverName?): Promise<User | null> {
    if (await this.getServerOwner()) {
      throw new Error('Cannot create multiple server owners')
    }

    try {
      const ownerAccount = await this.createUser({
        dto: { cardinalJWT: cardinalSSOJWT, role: 'owner' },
      })

      this.eventService.emitPrivate(
        UserEvents.CREATE_OWNER,
        {
          // If the user is claiming during First Time Setup, the server name
          // will not yet be in the database when the claim gets triggered by
          // this event. So, passing the name here is a convenient way to get
          // around the race condition.
          // 
          // You might be tempted to move this to the First Time Setup code, but
          // the claim can happen any time later if the user finishes the First
          // Time Setup as a guest.
          serverName,
          jwt: cardinalSSOJWT,
        } as CreateOwnerEventPayload,
      )

      return ownerAccount
    } catch (error) {
      Logger.error(error)
      return null
    }
  }

  /**
   * Creates the server owner account.
   * 
   * @param serverName - Optionally give a server name to attach to the event.
   */
  async createServerOwner(cardinalSSOJWT, serverName?): Promise<User | null> {
    if (await this.getServerOwner()) {
      throw new Error('Cannot create multiple server owners')
    }

    try {
      const ownerAccount = await this.createUser({
        dto: { cardinalJWT: cardinalSSOJWT, role: 'owner' },
      })

      this.eventService.emitPrivate(UserEvents.CREATE_OWNER, serverName ? { serverName } as CreateOwnerEventPayload : undefined)

      return ownerAccount
    } catch (error) {
      Logger.error(error)
      return null
    }
  }

  /**
   * Returns the local user account associated with the Cardinal account that
   * has claimed this Media Server.
   */
  async getServerOwner(): Promise<User | null> {
    const ownerAssignment = await this.rbacService.getRoleAssignments('owner')

    if (!ownerAssignment.length) {
      return null
    }

    if (ownerAssignment.length > 1) {
      Logger.error('More than 1 server owner detected.')
      return null
    }

    if (!ownerAssignment[0]?.user) {
      Logger.error('Invalid owner role assignment detected.')
      return null
    }

    return ownerAssignment[0].user
  }

  /**
   * Deletes the local user account associated with the Cardinal account that
   * has claimed this Media Server.
   * 
   * Returns true if the server owner was deleted, else false.
   */
  async deleteServerOwner(): Promise<boolean> {
    try {
      const serverOwner = await this.getServerOwner()
      await this.userRepository.delete({ id: serverOwner.id })
      Logger.log('Unlinked server owner Cardinal account.', 'User')
      return true
    } catch (e) {
      Logger.error(e)
      return false
    }
  }

  /**
   * Returns the subscription license of the server owner. Defaults to Free if
   * there is no owner.
   */
  async getServerOwnerSubscription(): Promise<SubscriptionTier> {
    const owner = await this.getServerOwner()

    if (!owner) {
      return SUBSCRIPTIONS['free']
    }

    const ownerSubscriptionSlug = owner?.cachedCloudUser?.subscription
    const subscription = getSubscription(ownerSubscriptionSlug)

    if (subscription) {
      return subscription
    } else {
      throw new Error('Could not determine license')
    }
  }

  /**
   * Returns the subscription license of the server owner. Defaults to Free if
   * there is no owner.
   */
  async getServerOwnerSubscription(): Promise<SubscriptionTier> {
    const owner = await this.getServerOwner()

    if (!owner) {
      return SUBSCRIPTIONS['free']
    }

    const ownerSubscriptionSlug = owner?.cachedCloudUser?.subscription
    const subscription = getSubscription(ownerSubscriptionSlug)

    if (subscription) {
      return subscription
    } else {
      throw new Error('Could not determine license')
    }
  }

  /**
   * Returns the local user that is associated with the given local ID.
   */
  async getUserByLocalId(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: {
        userId,
      },
      relations: {
        roles: true,
      },
    })
  }

  /**
   * Returns the local user that is associated with the given local JWT.
   */
  async getUserByLocalJWT(localJWT: string): Promise<User | null> {
    const payload = getJWTPayload(localJWT) as LocalUserJWTPayload
    return await this.userRepository.findOne({
      where: {
        userId: payload?.uid,
      },
      relations: {
        roles: true,
      },
    })
  }

  /**
   * Returns the local user that is associated with the given Cardinal ID.
   */
  async getUserByCardinalId(cardinalId: string): Promise<User | null> {
    return await this.userRepository.findOne({
       where: {
        cardinalId,
      },
      relations: {
        roles: true,
      },
    })
  }

  /**
   * Returns the local user that is associated with the given Cardinal JWT.
   */
  async getUserByCardinalJWT(cardinalJWT: string): Promise<User | null> {
    const payload = getJWTPayload(cardinalJWT) as CloudUserJWTPayload
    return await this.userRepository.findOne({
      where: {
        cardinalId: payload?.userId,
      },
      relations: {
        roles: true,
      },
    })
  }

  /**
   * Returns the local user that is associated with local username.
   */
  async getUserByLocalUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: {
        username,
      },
      relations: {
        roles: true,
      },
    })
  }

  /**
   * Returns the guest account. There is a check during server startup to
   * guarentee it exists.
   */
  async getGuestAccount(): Promise<User> {
    return await this.userRepository.findOne({
      where: {
        designation: Designations.GUEST_ACCOUNT,
      },
      relations: {
        roles: true,
      },
    })
  }

  /**
   * Returns whether the guest account is enabled.
   */
  async guestAccountIsEnabled(): Promise<boolean> {
    const guestAccount = await this.getGuestAccount()
    return guestAccount.enabled
  }

  /**
   * Checks if the given password is correct.
   */
  async verifyPassword(username: string, password: string): Promise<boolean> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .getOne()

    return await bcrypt.compare(password, user.password)
  }

  /**
   * Returns all users according to the query.
   */
  async query(getUsersDto: GetUsersDto): Promise<[User[], number]> {
    const { take, skip, order, sort, roles: roleAssignments } = getUsersDto
    return await this.userRepository.findAndCount({
      take,
      skip,
      order: {
        [sort]: order,
      },
      relations: {
        ...(roleAssignments ? { roles: true } : {}),
      },
    })
  }

  /**
   * Returns an array of all users with all sensitive information filtered out.
   */
  async getUsersForPublic(): Promise<Partial<User>[]> {
    let users

    if (await this.guestAccountIsEnabled()) {
      users = await this.userRepository.find()
    } else {
      users = await this.userRepository.find({
        where: [
          { designation: Not(Designations.GUEST_ACCOUNT) },
          { designation: IsNull() },
        ],
      })
    }

    return users.map((user) => this.cleanseUserObject(user))
  }

  /**
   * Returns an array of active Media Server users.
   */
  async getActiveUsers(): Promise<User[]> {
    const users = await this.userRepository.find({
      order: {
        activityStatusUpdatedAt: 'desc',
      },
    })
    const activeUsers = users.filter((user) => {
      if (!user.activityStatus || !user.activityStatusUpdatedAt) {
        return false
      }
      return Date.now() - new Date(user.activityStatusUpdatedAt).getTime() <= ms('15 minutes')
    })
    return activeUsers
  }

  /**
   * Deletes a user from the Media Server database, thereby also unlinking their
   * Cardinal account.
   */
  async deleteUser(userId: number, soft = true): Promise<boolean> {
    if (soft) {
      await this.userRepository.softDelete(userId)
      return true
    } else {
      await this.userRepository.delete(userId)
      return true
    }
  }

  /**
   * Removes all sensitive data from a user object.
   */
  cleanseUserObject(userObject): Partial<User> {
    return {
      userId: userObject.userId,
      role: userObject.role,
      designation: userObject.designation,
      createdAt: userObject.createdAt,
      cardinalId: userObject.cardinalId,
      cachedCloudUser: userObject.cachedCloudUser,
      cachedCloudUserAt: userObject.cachedCloudUserAt,
      roles: userObject.roles,
      username: userObject.username,
    }
  }
}
