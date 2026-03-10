import { IsString } from 'class-validator'

export class CreatePlaybackQueueNextItemsDto {
  // TODO allow the user to steer the dynamic direction
  @IsString()
  direction: string
}
