import { IsOptional, IsString } from 'class-validator'

export class CreatePlaybackQueueNextItemsDto {
  // TODO allow the user to steer the dynamic direction
  @IsOptional()
  @IsString()
  direction?: string
}
