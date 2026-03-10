import {
  Controller,
  Headers,
  Param,
  Body,
  Get,
  Post,
  MethodNotAllowedException,
  Query,
  Patch,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import {
  ApiTags,
  ApiExcludeEndpoint,
} from '@nestjs/swagger'

import { UserService } from './user.service'
import { LocalUserService } from './local-user.service'
import { CloudUserService } from './cloud-user.service'
import { User } from './user.entity'
import { CreateUser } from './dtos/CreateUser.dto'
import { UpdateUserDto } from './dtos/UpdateUser.dto'
import { GetUserResponse } from './dtos/GetUserResponse.dto'
import { CurrentUser } from '../../decorators/CurrentUser.decorator'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

import { getJWTFromHeaders, getCardinalTolkienFromHeaders } from '../../utils/jwt'
import { GetUsersDto } from './dtos/GetUsers.dto'
import { SeatsService } from './seats.service'
import { Designations } from './types'

@Controller()
@ApiTags('Users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly localUserService: LocalUserService,
    private readonly cloudUserService: CloudUserService,
    private readonly seatsService: SeatsService,
  ) {}

  /**
   * Returns information about the currently logged in user. Local online
   * accounts must also provide their cloud token.
   * 
   * This may trigger a refresh of the cached cloud user data.
   */
  @Get('/users/current')
  @StandardEndpoint({
    summary: 'Get the currently logged in user.',
    capabilities: ['CurrentUser.Read'],
    cloudUserHeader: true,
  })
  async getCurrentUser(@Headers() headers): Promise<GetUserResponse> {
    const localUserJWT = getJWTFromHeaders(headers)
    const cloudUserJWT = getCardinalTolkienFromHeaders(headers)

    const localUser = await this.userService.getUserByLocalJWT(localUserJWT)

    // It's an offline account
    if (!localUser?.cardinalId) {
      return {
        localUser: this.userService.cleanseUserObject(localUser),
      }
    }

    // TODO return a 400 if the cloud token is missing for a cloud user

    // Database cache is sufficient
    if (!await this.cloudUserService.localUserNeedsRefresh(localUser.userId)) {
      return {
        localUser: this.userService.cleanseUserObject(localUser),
        cardinalUser: localUser?.cachedCloudUser,
      }
    }

    // Refresh the cached user data by fetching from the auth servers
    try {
      const refreshedUser = await this.cloudUserService.maybeRefreshCloudUserInDatabase(localUser.userId, cloudUserJWT)
      return {
        localUser: this.userService.cleanseUserObject(localUser),
        cardinalUser: refreshedUser?.cachedCloudUser,
      }
    } catch (error) {
      if (error.message == 405) {
        throw new MethodNotAllowedException()
      }
    }
  }

  /**
   * Returns the server owner, if there is one.
   */
  @Get('/users/owner')
  @StandardEndpoint({
    summary: 'Returns the server owner, if there is one.',
    capabilities: ['Users.Read'],
  })
  async getOwner(): Promise<Partial<User> | null> {
    return await this.userService.getServerOwner()
  }

  /**
   * Returns all active users for this server.
   */
  @Get('/users/active')
  @StandardEndpoint({
    summary: 'Get active Media Server users.',
    capabilities: ['Users.Read'],
  })
  async getActiveUsers(): Promise<User[]> {
    return await this.userService.getActiveUsers()
  }

  /**
   * Returns all users in this server.
   */
  @Get('/users')
  @StandardEndpoint({
    summary: 'Get all users in this server.',
    capabilities: ['Users.Read'],
  })
  async getUsers(@Query() query: GetUsersDto): Promise<[Partial<User>[], number]> {
    return await this.userService.query(query)
  }

  /**
   * Returns the user for the given local user ID.
   */
  @Get('/users/:id')
  @StandardEndpoint({
    summary: 'Get a specific user.',
    capabilities: ['Users.Read'],
  })
  async getUser(@Param('id') id: string): Promise<User | Record<never, never>> {
    return await this.userService.getUserByLocalId(id)
  }

  /**
   * Creates user in the Media Server. These users are stored in the Media
   * Server's database, so technically they are all "local" users, but there is
   * a further distinction that is outlined on:
   * 
   * https://help.cardinalapps.io/guides/cardinal-media-server/accounts
   * 
   * Cloud accounts are not created here - instead the are created by the auth
   * service as a SSO login side effect.
   */
  @Post('/users')
  @StandardEndpoint({
    summary: 'Create a new local Media Server user.',
    capabilities: ['Users.Create'],
  })
  async createLocalUser(@Body() createUserDto: CreateUser): Promise<User> {
    return await this.userService.createUser({ dto: createUserDto })
  }

  // TODO can this be deleted? I cannot find any usages of it on the client
  // side, but it comes from a time before RTK APIs so I'm only 99% sure I've
  // tracked down every use. It just maps to the other method above anyway.
  @Post('/user')
  @StandardEndpoint({
    description: '"POST /user" is deprecated. User "POST /users" instead.',
    capabilities: ['Users.Create'],
  })
  @ApiExcludeEndpoint()
  async legacyCreateLocalUser(@Body() createUserDto: CreateUser): Promise<User> {
    Logger.warn('"POST /user" is deprecated. User "POST /users" instead.')
    return await this.createLocalUser(createUserDto)
  }

  /**
   * TODO split this into two separate endpoints, one for updating your own
   * user, and one for updating other users. The endpoint for yourself should
   * require CurrentUser.Update and the one for other users should require
   * Users.Update.
   */
  @Patch('/users/:id')
  @StandardEndpoint({
    summary: 'Update a user.',
    capabilities: ['Users.Update'],
  })
  async updateUser(
    @Param('id') id,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<User> {
    const usersThatCanUseThisEndpoint = []

    // Special case: prevent disabling your own user
    if (id === currentUser.userId && updateUserDto.enabled === false) {
      throw new UnauthorizedException('You cannot disable your current user.')
    }

    // Server owner can update anyone
    const serverOwner = await this.userService.getServerOwner()
    usersThatCanUseThisEndpoint.push(serverOwner.userId)

    // Users can update themselves
    usersThatCanUseThisEndpoint.push(id)

    // User is allow to perform this update
    if (usersThatCanUseThisEndpoint.includes(currentUser.userId)) {
      const userPriorToUpdate = await this.userService.get(id)

      // If trying to enable a user (but not the Guest Account), check if there is a seat available
      if (
        (updateUserDto?.enabled === true && userPriorToUpdate.enabled === false)
        && userPriorToUpdate.designation !== Designations.GUEST_ACCOUNT
      ) {
        if (!await this.seatsService.hasAvailableSeats()) {
          throw new ForbiddenException('Cannot enable this user because there are no seats available.')
        }
      }

      try {
        return await this.userService.update(id, updateUserDto)
      } catch (error) {
        throw new InternalServerErrorException(error.message)
      }
    }

    throw new UnauthorizedException()
  }
}
