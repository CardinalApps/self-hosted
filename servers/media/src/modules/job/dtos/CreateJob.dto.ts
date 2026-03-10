import { IsString } from 'class-validator'

import { JobType } from '../enums'

export class CreateJobDto  {
  @IsString()
  type: JobType
}
