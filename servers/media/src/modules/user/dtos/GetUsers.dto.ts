import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'
import { toBoolean } from '../../../utils/transformers'

enum AllowedUsersOrderBy {
  'createdAt' = 'createdAt',
}

class UsersPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedUsersOrderBy))
  sort?: AllowedUsersOrderBy = AllowedUsersOrderBy.createdAt
}

export class GetUsersDto extends UsersPagination {
  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  roles?: boolean
}
