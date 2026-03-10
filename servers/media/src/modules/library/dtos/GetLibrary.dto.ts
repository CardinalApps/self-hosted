import { Transform } from 'class-transformer'
import { IsNumber } from 'class-validator'

import { toNumber } from '../../../utils/transformers'

export class GetLibraryDto {
  @Transform(toNumber)
  @IsNumber()
  id: number
}
