import { Transform } from 'class-transformer'
import { IsNumber, IsString, Min, Max } from 'class-validator'

import { toNumber } from '../../../utils/transformers'

export class SetRatingDto {
  @IsString()
  trackId: string

  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  @Max(1)
  rating: number
}
