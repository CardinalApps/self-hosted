import { Transform } from 'class-transformer'
import { IsBoolean, IsArray, IsOptional } from 'class-validator'

import { toArrayOfStrings } from '../../../utils/transformers'

export class DeleteFilesDto {
  @Transform(toArrayOfStrings)
  @IsArray()
  ids: string[] = []

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  hardDelete?: boolean = false
}
