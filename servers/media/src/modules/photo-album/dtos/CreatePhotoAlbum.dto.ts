import { IsString } from 'class-validator'

export class CreatePhotoAlbumDto {
  @IsString()
  name: string
}
