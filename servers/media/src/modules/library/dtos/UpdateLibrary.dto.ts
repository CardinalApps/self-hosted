import { Transform } from 'class-transformer'
import { IsArray, IsString, IsNumber, IsOptional } from 'class-validator'

import { toNumber, toString } from '../../../utils/transformers'

export class UpdateLibraryParamsDto {
  @Transform(toNumber)
  @IsNumber()
  id: number
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
