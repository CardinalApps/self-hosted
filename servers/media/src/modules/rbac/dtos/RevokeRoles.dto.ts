import { IsArray, ArrayNotEmpty } from 'class-validator'
import { Transform } from 'class-transformer'

import { toArrayOfStrings } from '../../../utils/transformers'

export class RevokeRolesDto {
  @Transform(toArrayOfStrings)
  @IsArray()
  @ArrayNotEmpty()
  userIds: string[] = []
}
