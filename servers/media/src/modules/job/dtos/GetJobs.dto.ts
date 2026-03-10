import { Transform } from 'class-transformer'
import { IsString, IsOptional } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'

class AllJobsPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  orderBy?: 'createdAt' | 'updatedAt' = 'createdAt'
}

export class GetJobsDto extends AllJobsPagination {}
