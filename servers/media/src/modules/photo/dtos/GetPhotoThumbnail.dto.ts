import { IsOptional, IsString } from 'class-validator'

export class getPhotoThumbnailDto {
  @IsOptional()
  @IsString()
  size?: 'small_nocrop' | 'medium_nocrop' = 'small_nocrop'
}
