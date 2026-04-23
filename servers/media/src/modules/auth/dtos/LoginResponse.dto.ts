import { IsString, IsOptional } from 'class-validator'

import { User } from '../../user/user.entity'

export class LoginResponse {
  @IsString()
  JWT: string

  @IsString()
  user: Partial<User>

  /**
   * The security implications of returning a cloud JWT to the client are
   * understood and accounted for.
   */
  @IsOptional()
  @IsString()
  cloudJWT?: string

  @IsOptional()
  @IsString()
  cloudUser?: object

  @IsOptional()
  @IsString()
  refreshToken?: string

  @IsOptional()
  scope?: 'local' | 'session' | 'memory'
}
