import { Transform } from 'class-transformer'
import { IsArray, IsString, IsOptional } from 'class-validator'

import { toArrayOfStrings, toString } from '../../../utils/transformers'

export class GetFilesDto {
  @Transform(toArrayOfStrings)
  @IsArray()
  @IsOptional()
  ids?: string[] = []

  @Transform(toString)
  @IsString()
  @IsOptional()
  library?: string
}
