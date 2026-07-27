import { PlaybackQueue } from '../playback-queue.entity'
import { PlaybackQueueItem } from '../playback-queue-item.entity'
import { DynamicQueueType } from '../dtos/CreatePlaybackQueue'

/**
 * DynamicQueue shapes one type of dynamic queue. Every type answers the same
 * two questions — what the queue starts with, and what it plays next — as music
 * track ids in playing order. Writing the rows is the caller's job.
 */
export interface DynamicQueue {
  // The `dynamicType` of the queues this service generates
  readonly dynamicType: DynamicQueueType

  // Whether the type is meaningless without a seed release or artist
  readonly requiresSeed: boolean

  // The tracks a queue of this type is created with
  init(queue: PlaybackQueue): Promise<string[]>

  // The next batch of tracks for a queue that is running low
  next(queue: PlaybackQueue, existingItems: PlaybackQueueItem[], batchSize: number): Promise<string[]>
}
