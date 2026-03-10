import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsIn } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'

enum AllowedRoleAssignmentsOrderBy {
  'name' = 'name',
}

class RoleAssignmentsPagination extends Pagination {
  @Transform(({ value }) => String(value))
  @IsOptional()
  @IsString()
  @IsIn(Object.values(AllowedRoleAssignmentsOrderBy))
  sort?: AllowedRoleAssignmentsOrderBy = AllowedRoleAssignmentsOrderBy.name
}

export class GetRoleAssignmentsDto extends RoleAssignmentsPagination {
  @IsString()
  @IsOptional()
  userId?: string
}
