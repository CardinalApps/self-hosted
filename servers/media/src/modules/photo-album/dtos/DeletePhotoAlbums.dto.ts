import { Transform } from 'class-transformer'
import { IsNumber } from 'class-validator'
import { toNumber } from '../../../utils/transformers'

export class DeletePhotoAlbumsDto {
  @Transform(toNumber)
  @IsNumber()
  id: number
}
