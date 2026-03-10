import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { getJWTPayload } from '../../utils/jwt'

import { UserService } from '../user/user.service'

/**
 * The CardinalToken service issues and verifies tokens for this server. It uses
 * the Nest JWT service for this.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Creates a new JWT for a local user account.
   * 
   * If a Cardinal JWT is given, then some data from it will be copied into the
   * Media Server JWT.
   */
  async createJWT(userId: string, cardinalJWT?: string): Promise<string | null> {
    const user = await this.userService.get(userId)

    if (!user) {
      Logger.warn('Invalid user ID', 'Auth')
      return null
    }

    const cardinalJWTPayload = cardinalJWT ? getJWTPayload(cardinalJWT) : null

    return this.jwtService.sign({
      uid: user.userId,
      role: user.role,
      designation: user.designation,
      cardinalId: cardinalJWTPayload ? cardinalJWTPayload.userId : null,
      exp: Date.now() + 315360000000, // 10 years
    })
  }

  /**
   * Checks whether the given JWT was signed by this server.
   */
  verifyJWT(JWT): boolean {
    try {
      const result = this.jwtService.verify(JWT)
      return typeof result === 'object' && 'uid' in result
    } catch (error) {
      return false
    }
  }
}
