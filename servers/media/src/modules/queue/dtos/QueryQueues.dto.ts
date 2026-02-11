import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsIn } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'
import { QueueType } from '../queue.entity'
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

export class QueryQueuesDto extends QueuePagination {
  @Transform(toString)
  @IsOptional()
  @IsString()
  type?: QueueType
}
