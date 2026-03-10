import { MediaServerRoleNames } from '@cardinalapps/access-control/dist/cjs'
import { IsOptional, IsString, IsNotEmpty } from 'class-validator'

export class CreateUser {
  @IsOptional()
  @IsString()
  cardinalJWT?: string

  @IsOptional()
  @IsString()
  username?: string

  @IsOptional()
  @IsString()
  password?: string

  @IsString()
  @IsNotEmpty()
  role: MediaServerRoleNames
}
