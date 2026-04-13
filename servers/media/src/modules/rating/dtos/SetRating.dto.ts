import { Transform } from 'class-transformer'
import { IsNumber, IsString, IsIn, Min, Max } from 'class-validator'

import { toNumber } from '../../../utils/transformers'
import { RatingMediaType } from '../rating.entity'

export class SetRatingDto {
  @IsString()
  @IsIn(Object.values(RatingMediaType))
  mediaType: RatingMediaType

  @IsString()
  mediaId: string

  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  @Max(1)
  rating: number
}
