import { Injectable } from '@nestjs/common'
import { getMediaServerRole, hasCapability, MediaServerCapability, MediaServerRoleName } from '@cardinalapps/access-control/dist/cjs'

import { UserService } from '../../user/user.service'
import { CloudUserService } from '../../user/cloud-user.service'
import { SeatsService } from '../../user/seats.service'

import { LoginResponse } from '../dtos/LoginResponse.dto'
import { TokenService } from '../token.service'
import { User } from '../../user/user.entity'
import { CardinalApp } from '../../../utils/apps'

import { APP_LOGIN_CAPABILITY } from '../types'

/**
 * Logs a user into their media server using a Cardinal cloud account.
 */
@Injectable()
export class CardinalSSOStrategy {
  constructor(
    private readonly userService: UserService,
    private readonly seatsService: SeatsService,
    private readonly cloudUserService: CloudUserService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Cardinal cloud accounts are the primary mechanism for authentication. This
   * login method can trigger several side effects, including sending emails and
   * claiming ownership of the server.
   */
  async login(localUserId: string, cardinalSSOToken, app: CardinalApp): Promise<LoginResponse> {
    const cloudUser = await this.validateJWT(cardinalSSOToken)

    if (!cloudUser) {
      throw new Error('Invalid JWT')
    }

    /**
     * Path 1:
     * 
     *    - Main path, the SSO JWT matches an existing user. Log into their
     *      local account.
     */
    const localUser = await this.userService.getUserByCardinalJWT(cardinalSSOToken)
    if (localUser) {
      this.throwIfFailedLoginRBAC(localUser, app)
      return await this.loginSuccess(localUser, cardinalSSOToken)
    }

    /**
     * Path 2: 
     * 
     *    - The SSO JWT didn't match a user.
     * 
     * Check if there are any seated users. If there are none, handle the first
     * login.
     */
    const numSeatedUsers = await this.seatsService.countSeatedUsers()
    if (numSeatedUsers === 0) {
      return await this.handleFirstCardinalUserLogin(cardinalSSOToken)
    }

    /**
     * Path 3:
     * 
     *    - The SSO JWT didn't match a user.
     *    - We have >=1 seated users in the database.
     * 
     * Check if a seat is available, and do not proceed if server is full.
     */
    if (!await this.seatsService.hasAvailableSeats()) {
      throw new Error('User login denied, no seats available.')
    }

    /**
     * Path 4:
     * 
     *    - The SSO JWT didn't match a user.
     *    - We have >=1 seated users in the database.
     *    - At least 1 seat is available.
     * 
     * If this server requires users to be invited to join, validate the invitation.
     */
    // TODO set this to true once invitations are ready
    const requiresInvitation = false
    let allowToJoin = false

    if (requiresInvitation) {
      // TODO add cloud invitations
      allowToJoin = false
      throw new Error('An invitation is required to join this server.')
    } else {
      allowToJoin = true
    }

    /**
     * Grant the user a seat by creating a local account for them.
     */
    if (allowToJoin) {
      return await this.handleNewCardinalUser(cardinalSSOToken, app)
    } else {
      throw new Error('User login failed.')
    }
  }

  /**
   * Send the Cardinal JWT back to the cloud servers to check its authenticity.
   */
  private async validateJWT(cardinalSSOJWT): Promise<Record<string, unknown>> {
    try {
      return await this.cloudUserService.getCardinalCloudUser(cardinalSSOJWT)
    } catch (error) {
      throw new Error('Cannot log into online account - SSO token rejected')
    }
  }

  /**
   * The first time a Cardinal user logs into this server make them the server owner.
   */
  private async handleFirstCardinalUserLogin(cardinalSSOToken): Promise<LoginResponse> {
    const ownerAccount = await this.userService.getServerOwner()

    if (ownerAccount) {
      throw new Error('This server is already owned by another Cardinal account')
    }

    // There is no owner, claim the server
    const newOwnerAccount = await this.userService.createServerOwner(cardinalSSOToken)

    if (!newOwnerAccount) {
      throw new Error('Failed to create server owner account.')
    }

    return await this.loginSuccess(newOwnerAccount, cardinalSSOToken)
  }

  /**
   * When a new Cardinal user is logging in for the first time, create a local
   * user for them.
   */
  private async handleNewCardinalUser(cardinalSSOToken, app: CardinalApp): Promise<LoginResponse> {
    const newUser = await this.userService.createUser({
      dto: {
        cardinalJWT: cardinalSSOToken,
        role: 'newcomer',
      },
    })

    // If the new user's first login attempt in in an app that they don't have
    // access to, then their account will still be made but their session will
    // be denied
    this.throwIfFailedLoginRBAC(newUser, app)

    return await this.loginSuccess(newUser, cardinalSSOToken)
  }

  /**
   * Creates the login success object.
   */
  private async loginSuccess(user: User, cloudJWT: string): Promise<LoginResponse> {
    const accessToken = await this.tokenService.createAccessToken(user.userId)
    return {
      JWT: accessToken,
      refreshToken: await this.tokenService.createRefreshToken(user.userId),
      user: this.userService.cleanseUserObject(user),
      cloudJWT: cloudJWT,
      cloudUser: user.cachedCloudUser,
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
