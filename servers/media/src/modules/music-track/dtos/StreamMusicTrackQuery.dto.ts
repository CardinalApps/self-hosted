import { Transform } from 'class-transformer'
import { IsBoolean, IsNumber, IsOptional } from 'class-validator'

import { toNumber } from '../../../utils/transformers'

export class StreamMusicTrackQueryDto {
  @Transform(({ value }) => value !== undefined)
  @IsOptional()
  @IsBoolean()
  transcode?: boolean

  @Transform(toNumber)
  @IsOptional()
  @IsNumber()
  bitrate?: number
}
