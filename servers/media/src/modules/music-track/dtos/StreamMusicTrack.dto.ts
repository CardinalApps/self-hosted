import { Transform } from 'class-transformer'
import { IsString } from 'class-validator'

import { toString } from '../../../utils/transformers'

export class StreamMusicTrackDto {
  @Transform(toString)
  @IsString()
  id: string
}
