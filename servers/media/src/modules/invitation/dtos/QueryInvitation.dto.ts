import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'
import { InvitationType } from '../invitation.entity'
import { toBoolean, toString } from '../../../utils/transformers'

enum AllowedMusicTracksOrderBy {
  'createdAt' = 'createdAt',
}

class InvitationPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedMusicTracksOrderBy))
  sort?: AllowedMusicTracksOrderBy = AllowedMusicTracksOrderBy.createdAt
}

export class QueryInvitationDto extends InvitationPagination {
  @Transform(toString)
  @IsOptional()
  @IsString()
  type?: InvitationType

  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  isExpired?: boolean
}
