import { Transform } from 'class-transformer'
import { IsNumber, IsString } from 'class-validator'

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
