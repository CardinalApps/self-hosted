import { ArrayNotEmpty, IsArray } from 'class-validator'
import { Transform } from 'class-transformer'

import { toArrayOfStrings } from '../../../utils/transformers'

export class AssignRolesDto {
  @Transform(toArrayOfStrings)
  @IsArray()
  @ArrayNotEmpty()
  userIds: string[] = []
}
