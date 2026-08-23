import { Transform } from 'class-transformer'
import { IsArray, IsString, IsOptional } from 'class-validator'

import { toString } from '../../../utils/transformers'

export class UpdateLibraryParamsDto {
  @Transform(toString)
  @IsString()
  id: string
}

export class UpdateLibraryBodyDto {
  @Transform(toString)
  @IsString()
  @IsOptional()
  name?: string

  @IsArray()
  @IsOptional()
  paths?: string[]
}
