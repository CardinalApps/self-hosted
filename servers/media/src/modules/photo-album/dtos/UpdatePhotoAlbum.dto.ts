import { Transform } from 'class-transformer'
import { IsString, IsNumber } from 'class-validator'

import { toNumber, toString } from '../../../utils/transformers'

export class UpdatePhotoAlbumParamsDto {
  @Transform(toNumber)
  @IsNumber()
  id: number
}

export class UpdatePhotoAlbumBodyDto {
  @Transform(toString)
  @IsString()
  name: string
}
