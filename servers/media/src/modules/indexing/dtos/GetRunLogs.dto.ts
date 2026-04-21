import { IsString } from 'class-validator'

import { Pagination } from '../../../dtos/pagination.dto'

export class GetRunLogsDto extends Pagination {
  @IsString()
  runId: string
}
