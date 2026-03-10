import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsIn, IsNumber, IsBoolean } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'
import { toBoolean, toNumber, toString } from '../../../utils/transformers'
// import { QueueType } from '@cardinalapps/types/src/playback-queue'
// import { toString } from '../../../utils/transformers'

enum AllowedMusicTracksOrderBy {
  'createdAt' = 'createdAt',
}

class QueuePagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedMusicTracksOrderBy))
  sort?: AllowedMusicTracksOrderBy = AllowedMusicTracksOrderBy.createdAt
}

export class QueryPlaybackQueueItemsDto extends QueuePagination {
  @Transform(toString)
  @IsString()
  @IsOptional()
  currentQueueItemId?: string

  @Transform(toNumber)
  @IsNumber()
  @IsOptional()
  leading?: number

  @Transform(toNumber)
  @IsNumber()
  @IsOptional()
  trailing?: number

  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  includeCurrentItemInReturn?: boolean = true
}
