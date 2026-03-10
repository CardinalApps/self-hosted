import { IsBoolean } from 'class-validator'

export class CreateRunDto {
  @IsBoolean()
  indexMusic: true

  @IsBoolean()
  indexPhotos: true

  @IsBoolean()
  indexMovies: true

  @IsBoolean()
  indexTV: true
}
