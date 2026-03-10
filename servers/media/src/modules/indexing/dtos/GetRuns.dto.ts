import { Transform } from 'class-transformer'
import { IsBoolean } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'

export class GetRunsDto extends Pagination {
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsBoolean()
  includeEmptyRuns = true
}
