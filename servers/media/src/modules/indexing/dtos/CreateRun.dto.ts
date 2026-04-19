import { IsBoolean, IsEnum } from 'class-validator'
import { RunType } from '../enums'

export class CreateRunDto {
  @IsBoolean()
  indexMusic: true

  @IsBoolean()
  indexPhotos: true

  @IsBoolean()
  indexMovies: true

  @IsBoolean()
  indexTV: true

  @IsEnum(RunType)
  type: RunType
}
