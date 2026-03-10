import { Injectable, Logger } from '@nestjs/common'
import { getMediaServerRole, hasCapability, MediaServerCapability, MediaServerRoleName } from '@cardinalapps/access-control/dist/cjs'

import { UserService } from '../../user/user.service'
import { Designations } from '../../user/types'
import { CardinalApp } from '../../../utils/apps'

import { LoginResponse } from '../dtos/LoginResponse.dto'
import { TokenService } from '../token.service'
import { User } from '../../user/user.entity'

import { APP_LOGIN_CAPABILITY } from '../types'

/**
 * Log into a local account. A local acocunt is one whose identity provider is
 * this server, not the Cardinal cloud.
 */
@Injectable()
export class LocalAuthStrategy {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async login(args: { localUserId?: string, app: CardinalApp, localUsername?: string, localPassword?: string }): Promise<LoginResponse> {
    const {
      localUserId,
      app,
      localUsername,
      localPassword,
    } = args
    if (localUserId) {
      return await this.loginWithUserId(app, localUserId)
    }

    if (localUsername) {
      return await this.loginWithUsernameAndPassword(app, localUsername, localPassword)
    }
  }

  /**
   * If a local user ID is given, it must be the guest account.
   */
  async loginWithUserId(app: CardinalApp, localUserId: string): Promise<LoginResponse> {
    const user = await this.userService.getUserByLocalId(localUserId)

    this.throwIfFailedLoginRBAC(user, app)

    if (user.cardinalId) {
      throw new Error('Cannot log into a cloud account without a SSO JWT')
    }

    if (user.designation !== Designations.GUEST_ACCOUNT) {
      throw new Error('The only local account supported is the Guest Account')
    }

    if (user.designation === Designations.GUEST_ACCOUNT && !await this.userService.guestAccountIsEnabled()) {
      throw new Error('Cannot log into Guest Account because it is disabled')
    }

    const JWT = await this.tokenService.createJWT(localUserId)

    Logger.log(`Guest account logged in`, 'Auth')

    return {
      JWT,
      user: this.userService.cleanseUserObject(user),
    }
  }

  /**
   * Try to log in with a local username and password.
   */
  async loginWithUsernameAndPassword(app: CardinalApp, username: string, password: string): Promise<LoginResponse> {
    const user = await this.userService.getUserByLocalUsername(username)

    if (!user) {
      throw new Error('Invalid username')
    }

    const passwordIsValid = await this.userService.verifyPassword(username, password)

    if (!passwordIsValid) {
      throw new Error('Invalid password')
    }

    this.throwIfFailedLoginRBAC(user, app)

    const JWT = await this.tokenService.createJWT(user.userId)

    Logger.log(`Local user ${user.userId} logged in`, 'Auth')

    return {
      JWT,
      user: this.userService.cleanseUserObject(user),
    }
  }

  /**
   * Throws an error if the user does not have the login capability for the app.
   */
  private throwIfFailedLoginRBAC(user: User, app: CardinalApp): boolean {
    if (!user || !app) {
      throw new Error(`Login failed, could not determine which app the user is trying to log into, got: ${app}`)
    }
    if (hasCapability<MediaServerCapability>(
      APP_LOGIN_CAPABILITY?.[app],
      user.roles?.flatMap((role) => getMediaServerRole(role.role as MediaServerRoleName).capabilities),
    )) {
      return true
    } else {
      throw new Error(`Login failed, user does not have the ${APP_LOGIN_CAPABILITY?.[app]} capability`)
    }
  }
}
