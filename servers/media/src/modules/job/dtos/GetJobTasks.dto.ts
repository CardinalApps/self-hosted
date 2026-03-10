import { IsString, IsOptional } from 'class-validator'

import { JobTaskType } from '../enums'

import { Pagination } from '../../../dtos/pagination.dto'

export class GetJobTasksDto extends Pagination {
  @IsOptional()
  @IsString()
  type?: JobTaskType
}
