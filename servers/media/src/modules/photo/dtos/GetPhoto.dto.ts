import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional } from 'class-validator'

export class GetPhotoDto {
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  file?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  metadata?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  thumbnails?: boolean = false

  @Transform(({ value }) => value?.toLowerCase() === 'true')
  @IsOptional()
  @IsBoolean()
  photoAlbumEntries?: boolean = false
}
