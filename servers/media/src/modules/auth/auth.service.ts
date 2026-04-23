import { Injectable } from '@nestjs/common'

import { UserService } from '../user/user.service'

import { CardinalSSOStrategy } from './strategies/cardinal-sso.service'
import { LocalAuthStrategy } from './strategies/local.service'
import { LoginResponse } from './dtos/LoginResponse.dto'
import { CardinalApp } from '../../utils/apps'

type LoginOptions = {
  localUserId?: string,
  localUsername?: string,
  localPassword?: string,
  ssoJWT?: string,
  app: CardinalApp,
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly cardinalSSOStrategy: CardinalSSOStrategy,
    private readonly localAuthStrategy: LocalAuthStrategy,
  ) {}

  /**
   * Attempts to logs into an account in this server.
   * 
   * This currently only supports Cardinal cloud accounts and a single shared
   * Guest Account.
   * 
   * Note: Logging in with an empty string password is supported.
   */
  async login(options: LoginOptions): Promise<LoginResponse> {
    const {
      localUserId,
      localUsername,
      localPassword,
      ssoJWT,
      app,
    } = options

    if (!localUserId && !ssoJWT && !localUsername) {
      throw new Error('One of the following login methods is required: SSO token, local username and password, or the Guest Account ID')
    }

    // Logging in with a cloud account
    if (ssoJWT) {
      return await this.cardinalSSOStrategy.login(localUserId, ssoJWT, app)
    }

    // Logging in with a local username and password
    if (localUsername) {
      return await this.localAuthStrategy.login({
        app,
        localUsername,
        localPassword,
      })
    }

    // Logging in with only a local user ID
    if (localUserId) {
      return await this.localAuthStrategy.login({
        app,
        localUserId,
      })
    }
  }
}
