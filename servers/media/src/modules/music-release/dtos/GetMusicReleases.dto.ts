import { Transform } from 'class-transformer'
import { IsBoolean, IsString, IsOptional, IsIn, IsArray } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'
import { toArrayOfStrings } from '../../../utils/transformers'

enum AllowedMusicReleasesOrderBy {
  'createdAt' = 'createdAt',
  'title' = 'title',
}

class MusicReleasesPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedMusicReleasesOrderBy))
  orderBy?: AllowedMusicReleasesOrderBy = AllowedMusicReleasesOrderBy.title
}

export class GetMusicReleasesDto extends MusicReleasesPagination {
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  genres?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  tracks?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  artists?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  thumbnails?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  metadata?: boolean = false

  @Transform(toArrayOfStrings)
  @IsArray()
  @IsOptional()
  libraries?: string[]
}
