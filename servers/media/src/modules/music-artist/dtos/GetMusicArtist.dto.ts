import { IsString } from 'class-validator'

export class GetMusicArtistDto {
  @IsString()
  id: string
}
