import { IsArray, IsOptional, IsString } from 'class-validator'
import { DynamicQueueType, QueueType } from '@cardinalapps/types/src/playback-queue'
import { Library } from '../../library/library.entity'
import { PlaybackQueueItem } from '../playback-queue-item.entity'

export class CreatePlaybackQueueDto {
  @IsString()
  type: QueueType

  @IsString()
  @IsOptional()
  dynamicType?: DynamicQueueType

  @IsArray()
  @IsOptional()
  libraries?: Partial<Library>[]

  @IsArray()
  @IsOptional()
  staticItems?: Partial<PlaybackQueueItem>[]
}
