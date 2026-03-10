import { Transform } from 'class-transformer'
import { IsString, IsArray } from 'class-validator'

import { toString } from '../../../utils/transformers'

export class CreateLibraryDto {
  @Transform(toString)
  @IsString()
  name: string

  @IsArray()
  paths: string[]
}
