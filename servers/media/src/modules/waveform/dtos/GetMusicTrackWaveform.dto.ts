import { Transform } from 'class-transformer'
import { IsString } from 'class-validator'

import { toString } from '../../../utils/transformers'

export class GetMusicTrackWaveformDto {
  @Transform(toString)
  @IsString()
  id: string
}
