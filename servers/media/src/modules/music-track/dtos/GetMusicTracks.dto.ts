import { Transform } from 'class-transformer'
import { IsBoolean, IsString, IsOptional, IsIn, IsArray } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'
import { toArrayOfStrings } from '../../../utils/transformers'

enum AllowedMusicTracksOrderBy {
  'createdAt' = 'createdAt',
  'title' = 'title',
  'trackNumber' = 'trackNumber',
  'discNumber' = 'discNumber',
  'duration' = 'duration',
  'bitrate' = 'bitrate',
  'playCount' = 'playCount',
  'rating' = 'rating',
}

class MusicTracksPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedMusicTracksOrderBy))
  orderBy?: AllowedMusicTracksOrderBy = AllowedMusicTracksOrderBy.title
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

  /**
   * Aggregating play counts touches the whole history table, so callers that
   * only need track rows can switch it off. Ordering by playCount turns it back
   * on regardless.
   */
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  playCount?: boolean = true

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  rating?: boolean = true
}
