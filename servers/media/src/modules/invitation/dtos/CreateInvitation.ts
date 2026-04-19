import { IsIn, IsOptional, IsString } from 'class-validator'
import { InvitationType } from '../invitation.entity'

export class CreateInvitationDto {
  @IsString()
  @IsIn(['link', 'user'] satisfies InvitationType[])
  type: InvitationType

  @IsString()
  @IsOptional()
  expiresAt?: string

  @IsString()
  @IsOptional()
  inviteeId?: string
}
