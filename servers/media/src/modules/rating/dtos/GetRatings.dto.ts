import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString, IsIn } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'

enum AllowedRatingsOrderBy {
  'createdAt' = 'createdAt',
  'rating' = 'rating',
}

class RatingsPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedRatingsOrderBy))
  sort?: AllowedRatingsOrderBy = AllowedRatingsOrderBy.createdAt
}

export class GetRatingsDto extends RatingsPagination {
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  favorites?: boolean = false
}
