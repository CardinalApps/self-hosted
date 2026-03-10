import { Transform } from 'class-transformer'
import { IsArray, IsString } from 'class-validator'

import { toString } from '../../../utils/transformers'

export class UpdatePhotoParamsDto {
  @Transform(toString)
  @IsString()
  id: string
}

export class UpdatePhotoBodyDto {
  @IsArray()
  photoAlbums: number[]
}
