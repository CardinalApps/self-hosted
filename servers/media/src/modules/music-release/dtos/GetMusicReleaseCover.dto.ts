import { IsOptional, IsString } from 'class-validator'

export class GetMusicReleaseCover {
  @IsOptional()
  @IsString()
  size?: 'small_nocrop' | 'medium_nocrop' = 'small_nocrop'
}
