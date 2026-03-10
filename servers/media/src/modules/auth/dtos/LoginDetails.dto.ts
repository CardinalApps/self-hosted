import { IsOptional, IsString } from 'class-validator'

export class LoginDetails {
  @IsOptional()
  @IsString()
  userId?: string

  @IsOptional()
  @IsString()
  username?: string

  @IsOptional()
  @IsString()
  password?: string

  @IsOptional()
  @IsString()
  cardinalJWT?: string
}
