import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsIn } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'

enum AllowedPlaybackEntriesOrderBy {
  'createdAt' = 'createdAt',
}

class MusicHistoryEntriesPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedPlaybackEntriesOrderBy))
  sort?: AllowedPlaybackEntriesOrderBy = AllowedPlaybackEntriesOrderBy.createdAt
}

export class GetMusicHistoryEntriesDto extends MusicHistoryEntriesPagination {

}
