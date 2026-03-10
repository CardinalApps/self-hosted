import { IsString } from 'class-validator'

export class CreateMusicTrackDto {
  @IsString()
  name: string
}
