import { IsArray, IsIn, IsOptional, IsString } from 'class-validator'
import { Library } from '../../library/library.entity'
import { PlaybackQueueItem } from '../playback-queue-item.entity'

export type QueueType = 'static' | 'dynamic'
export type DynamicQueueType = 'true_shuffle' | 'house_mix' | 'encore' | 'undertow' | 'fresh_music' | 'fresh_release'
export type QueueSeedMediaType = 'music_release' | 'music_artist'

export class CreatePlaybackQueueDto {
  @IsString()
  type: QueueType

  @IsString()
  @IsOptional()
  dynamicType?: DynamicQueueType

  @IsIn(['music_release', 'music_artist'])
  @IsOptional()
  seedMediaType?: QueueSeedMediaType

  @IsString()
  @IsOptional()
  seedMediaId?: string

  @IsArray()
  @IsOptional()
  libraries?: Partial<Library>[]

  @IsArray()
  @IsOptional()
  staticItems?: Partial<PlaybackQueueItem>[]
}
