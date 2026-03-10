import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as ms from 'ms'

import { authAPI } from '../../utils/cloud'
import { getJWTPayload } from '../../utils/jwt'

import { User } from './user.entity'

/**
 * This class is focused on working with the Cardinal auth servers.
 */
@Injectable()
export class CloudUserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * The Media Server will reach out to the cloud auth servers to refresh the
   * cached user object after this much time has passed. The main goal is to
   * reduce the load on the cloud servers.
   * 
   * FIXME We should probably decouple the remote logout from this check.
   */
  private cloudUserCacheLifetime = ms('8s')

  /**
   * Checks the payload of a JWT issued by the Cardinal cloud auth servers to
   * see if all the required properties are there, and if it's expired.
   * 
   * This does not validate the authenticity of the JWT - only the cloud auth
   * servers can do that for you. It also does not validate the headers or
   * signature of the JWT.
   */
  validateJWTPayload(JWT: string) {
    const payload = getJWTPayload(JWT)

    if (!payload?.exp || payload.exp as number < Date.now() / 1000) {
      return false
    }

    if (!payload?.sso) {
      return false
    }

    if (!payload?.role) {
      return false
    }

    if (!payload?.userId) {
      return false
    }

    return true
  }

  /**
   * Checks a user object that was returned from the auth servers to see if it
   * can be used.
   * 
   * Checks for a few things like being banned, unconfirmed email, etc.
   */
  throwIfInvalidCardinalAccount(userObj: Record<string, unknown>): void {
    if (!userObj) {
      throw new Error('Account cannot be verified.')
    }
    if (userObj?.role === 'banned') {
      throw new Error('This user cannot be used.')
    }
    if (!userObj?.confirmedEmail) {
      throw new Error("This account's email address must be confirmed before it can log into a server.")
    }
  }

  /**
   * Fetches the cloud user by sending the given JWT to the cloud auth servers
   * for verification. If the JWT is valid, the associated user object will be
   * returned. This is the best way to verify an unknown Cardinal JWT.
   */
  async getCardinalCloudUser(JWT): Promise<Record<string, unknown> | null> {
    let response = null

    try {
      response = await authAPI('/user', 'GET', {
        headers: {
          Authorization: `Bearer ${JWT}`,
        },
      })
    } catch (error) {
      Logger.error(`Error when fetching cloud user: ${error}`, 'User')
      throw new Error(error)
    }

    return response
  }

  /**
   * Sends the JWT to the auth servers to validate the authenticity of it. This
   * only checks if the *JWT* is valid, not if the returned user account is
   * valid for use (e.g., not banned). You may also want to use this
   * throwIfInvalidCardinalAccount().
   */
  async validateJWTAuthenticity(JWT): Promise<boolean> {
    const trueAccountFromAuthServers = await this.getCardinalCloudUser(JWT)
    const localAccount = await this.getLocalUserByCardinalJWT(JWT)

    if (trueAccountFromAuthServers?.userId !== localAccount.cardinalId) {
      return false
    }

    return true
  }

  /**
   * Determines if the user in the database should have its cached cloud data
   * refreshed.
   */
  async localUserNeedsRefresh(userId): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ userId: userId })
    const cachedAt = new Date(user.cachedCloudUserAt).getTime()

    return Date.now() > (cachedAt + this.cloudUserCacheLifetime)
  }

  /**
   * Refreshes the cached user object in the user table with a fresh one from
   * the auth servers.
   * 
   * This is designed to fail safely. If the auth servers are not connectable
   * for any reason, the refresh is skipped and the app is allowed to continue
   * operating normally.
   */
  async maybeRefreshCloudUserInDatabase(userId: string, cloudJWT: string, forceRefresh = false): Promise<User> {
    const user = await this.userRepository.findOneBy({ userId: userId })
    const cachedAt = new Date(user.cachedCloudUserAt).getTime()

    if (!forceRefresh) {
      // Cache is not expired
      if (Date.now() < (cachedAt + this.cloudUserCacheLifetime)) {
        return user
      }
    }

    // Get a new object from the cloud
    const freshObject = await this.getCardinalCloudUser(cloudJWT)

    if (!freshObject) {
      Logger.warn('Could not refresh cloud user data.', 'User')
      return user
    }

    try {
      await this.userRepository.update(
        { userId: user.userId },
        {
          cachedCloudUser: freshObject,
          cachedCloudUserAt: new Date(),
        },
      )
      Logger.log('Cloud user data refreshed.', 'User')
      return await this.userRepository.findOneBy({ userId: userId })
    } catch (error) {
      Logger.error('Could not update cloud user with refreshed data.', 'User')
      return user
    }
  }

  /**
   * Links a local account with a Cloud account.
   */
  async linkLocalAccountWithCloudAccount(localUserId, cloudUserJWT): Promise<boolean> {
    const localUser = await this.userRepository.findOneBy({ userId: localUserId })
    const cloudUser = await this.getCardinalCloudUser(cloudUserJWT)

    if (!localUser) {
      Logger.error('Could not link Cardinal account with local account because the lookup for the local user failed.', 'User')
    }

    if (!cloudUser) {
      Logger.error('Could not link Cardinal account with local account because the fetch for the cloud user failed.', 'User')
    }

    const linked = await this.userRepository.update(localUser.userId, {
      cachedCloudUser: cloudUser,
      cachedCloudUserAt: new Date(),
    })

    return !!linked
  }

  /**
   * Returns the local user that is associated with the given Cardinal ID.
   */
  async getLocalUserByCardinalId(cardinalId: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ cardinalId })
  }

  /**
   * Returns the local user that is associated with the given Cardinal JWT.
   */
  async getLocalUserByCardinalJWT(cardinalJWT: string): Promise<User | null> {
    const payload = getJWTPayload(cardinalJWT)
    return await this.userRepository.findOneBy({ cardinalId: payload?.userId as string })
  }
}
