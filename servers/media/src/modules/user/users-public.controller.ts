import {
  Controller,
  Get,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'

import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

import { UserService } from './user.service'
import { User } from './user.entity'

/**
 * Public endpoints in the User module.
 */
@Controller()
@ApiTags('Users (Public)')
export class PublicUserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  /**
   * Returns a curated list of sanitized user objects meant to be shown on the login screen.
   */
  @Get('/users/public')
  @StandardEndpoint({
    auth: false,
    summary: 'Get a list of users for the login screen.',
  })
  async getPublicUsers(): Promise<Partial<User>[]> {
    return await this.userService.getUsersForPublic()
  }
}
