import { Transform } from 'class-transformer'
import { IsBoolean, IsString, IsOptional, IsIn } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'

enum AllowedMusicReleasesOrderBy {
  'createdAt' = 'createdAt',
  'updatedAt' = 'updatedAt',
  'name' = 'name',
  'sortName' = 'sortName',
}

class MusicArtistsPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedMusicReleasesOrderBy))
  orderBy?: AllowedMusicReleasesOrderBy = AllowedMusicReleasesOrderBy.createdAt
}

export class GetMusicArtistsDto extends MusicArtistsPagination {
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  tracks?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  metadata?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  releases?: boolean = false
}
