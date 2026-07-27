import { Injectable, Logger } from '@nestjs/common'

import { PlaybackQueue } from '../playback-queue.entity'
import { PlaybackQueueItem } from '../playback-queue-item.entity'
import { DynamicQueueType } from '../dtos/CreatePlaybackQueue'

import { DynamicQueue } from './types'
import { TrackSelection } from './track-selection.service'

const INIT_BUFFER = 25

/**
 * Encore plays the whole seed release front to back, and queues up a buffer of
 * related tracks behind it for when the album ends.
 */
@Injectable()
export class EncoreQueue implements DynamicQueue {
  readonly dynamicType: DynamicQueueType = 'encore'
  readonly requiresSeed = true

  constructor(private readonly trackSelection: TrackSelection) {}

  /**
   * The release in album order, then the buffer.
   */
  async init(queue: PlaybackQueue): Promise<string[]> {
    const releaseTracks = await this.trackSelection.getSeedTracks(queue)

    if (!releaseTracks.length) {
      Logger.warn('An encore queue was created for a release with no tracks', 'EncoreQueue')
      return []
    }

    const releaseTrackIds = releaseTracks.map((track) => track.musicTrackId)
    const encore = await this.trackSelection.generateRelatedBatch(queue, releaseTracks, INIT_BUFFER, releaseTrackIds)

    return [...releaseTrackIds, ...encore]
  }

  /**
   * Once the album is behind it, the queue drifts the same way a mix does.
   */
  async next(queue: PlaybackQueue, existingItems: PlaybackQueueItem[], batchSize: number): Promise<string[]> {
    return await this.trackSelection.nextRelatedTracks(queue, existingItems, batchSize)
  }
}
