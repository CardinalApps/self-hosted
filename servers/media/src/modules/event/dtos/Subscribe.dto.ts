import { IsString } from 'class-validator'

export class SubscribeDto {
  // Token
  @IsString()
  authorization: string
}
