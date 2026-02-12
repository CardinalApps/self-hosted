import { IsOptional, IsString } from 'class-validator'
import { QueueType } from '../playbackQueue.entity'

export class CreatePlaybackQueueDto {
  @IsString()
  type: QueueType

  @IsString()
  @IsOptional()
  dynamicName?: string
}
