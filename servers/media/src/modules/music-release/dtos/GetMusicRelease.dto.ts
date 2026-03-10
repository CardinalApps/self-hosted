import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional } from 'class-validator'

import { toBoolean } from '../../../utils/transformers'

export class GetMusicReleaseDto {
  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  tracks?: boolean

  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  genres?: boolean

  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  artists?: boolean

  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  thumbnails?: boolean
}
