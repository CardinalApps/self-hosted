import { Transform } from 'class-transformer'
import { IsString } from 'class-validator'

export class StateChangeActionDto {
  @Transform(({ value }) => String(value))
  @IsString()
  action: 'pause' | 'resume' | 'stop'
}
