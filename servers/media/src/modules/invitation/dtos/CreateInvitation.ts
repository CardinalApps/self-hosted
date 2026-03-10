import { IsOptional, IsString } from 'class-validator'
import { InvitationType } from '../invitation.entity'

export class CreateInvitationDto {
  @IsString()
  type: InvitationType

  @IsString()
  @IsOptional()
  expiresAt?: string

  @IsString()
  @IsOptional()
  inviteeId?: string
}
