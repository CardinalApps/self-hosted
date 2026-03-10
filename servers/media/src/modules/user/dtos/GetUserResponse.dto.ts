import { IsOptional, IsString } from 'class-validator'
import { User } from '../user.entity'

export class GetUserResponse {
  @IsOptional()
  @IsString()
  cardinalUser?: object

  @IsString()
  localUser: Partial<User>
}
