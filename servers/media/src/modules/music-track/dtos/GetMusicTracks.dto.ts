import { Transform } from 'class-transformer'
import { IsBoolean, IsString, IsOptional, IsIn, IsArray } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'
import { toArrayOfStrings } from '../../../utils/transformers'

enum AllowedMusicTracksOrderBy {
  'createdAt' = 'createdAt',
  'updatedAt' = 'updatedAt',
  'title' = 'title',
  'trackNumber' = 'trackNumber',
  'discNumber' = 'discNumber',
  'duration' = 'duration',
  'bitrate' = 'bitrate',
  'playCount' = 'playCount',
}

class MusicTracksPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedMusicTracksOrderBy))
  sort?: AllowedMusicTracksOrderBy = AllowedMusicTracksOrderBy.trackNumber
}

export class GetMusicTracksDto extends MusicTracksPagination {
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  metadata?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  release?: boolean = true

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  artists?: boolean = true

  @Transform(toArrayOfStrings)
  @IsArray()
  @IsOptional()
  libraries?: string[]
}
