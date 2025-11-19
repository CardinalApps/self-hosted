import { Transform } from 'class-transformer'
import { IsNumber } from 'class-validator'

import { toNumber } from '../../../utils/transformers'

export class CreateMusicHistoryEntryDto {
  @Transform(toNumber)
  @IsNumber()
  seconds: number

  @IsString()
  trackId: string

  @IsString()
  queueItemId: string
}
