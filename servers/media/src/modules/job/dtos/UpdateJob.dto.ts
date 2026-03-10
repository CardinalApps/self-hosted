import { IsOptional, IsString } from 'class-validator'

import { JobStatus } from '../enums'

export class UpdateJobDto {
  @IsString()
  @IsOptional()
  status?: JobStatus

  @IsString()
  @IsOptional()
  completedAt?: Date
}
