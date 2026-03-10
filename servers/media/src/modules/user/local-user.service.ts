import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { getJWTPayload } from '../../utils/jwt'

import { User } from './user.entity'

/**
 * This class is focused on working with offline users.
 */
@Injectable()
export class LocalUserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

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
}
