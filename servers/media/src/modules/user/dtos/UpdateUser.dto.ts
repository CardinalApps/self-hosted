import { Transform } from 'class-transformer'
import { IsBoolean } from 'class-validator'
import { toBoolean } from '../../../utils/transformers'

export class UpdateUserDto {
  @Transform(toBoolean)
  @IsBoolean()
  enabled?: boolean
}
