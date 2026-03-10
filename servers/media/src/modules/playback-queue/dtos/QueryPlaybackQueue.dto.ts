import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsIn } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'
import { QueueType } from '@cardinalapps/types/src/playback-queue'
import { toString } from '../../../utils/transformers'

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

export class QueryPlaybackQueuesDto extends QueuePagination {
  @Transform(toString)
  @IsOptional()
  @IsIn(['static', 'dynamic'])
  type?: QueueType
}
