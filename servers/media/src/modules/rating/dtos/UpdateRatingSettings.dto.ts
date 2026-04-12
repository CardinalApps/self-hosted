import { Transform } from 'class-transformer'
import { IsNumber, Min, Max } from 'class-validator'

import { toNumber } from '../../../utils/transformers'

export class UpdateRatingSettingsDto {
  @Transform(toNumber)
  @IsNumber()
  @Min(1)
  @Max(10)
  starCount: number
}
