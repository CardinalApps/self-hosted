import { Transform } from 'class-transformer'
import { IsString } from 'class-validator'

import { toString } from '../../../utils/transformers'

export class GetMusicTrackDto {
  @Transform(toString)
  @IsString()
  id: string
}
