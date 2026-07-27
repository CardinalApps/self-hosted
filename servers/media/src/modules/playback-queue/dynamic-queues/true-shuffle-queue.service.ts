import { Injectable } from '@nestjs/common'

import { PlaybackQueue } from '../playback-queue.entity'
import { PlaybackQueueItem } from '../playback-queue-item.entity'
import { DynamicQueueType } from '../dtos/CreatePlaybackQueue'

import { DynamicQueue } from './types'
import { TrackSelection } from './track-selection.service'

const INIT_BATCH = 200

/**
 * True Shuffle plays random songs from the given libraries. Randomization is
 * applied by the database.
 */
@Injectable()
export class TrueShuffleQueue implements DynamicQueue {
  readonly dynamicType: DynamicQueueType = 'true_shuffle'
  readonly requiresSeed = false

  constructor(private readonly trackSelection: TrackSelection) {}

  /**
   * A True Shuffle queue opens with 200 random tracks.
   */
  async init(queue: PlaybackQueue): Promise<string[]> {
    return await this.trackSelection.randomTracks(queue, INIT_BATCH, [])
  }

  /**
   * More random tracks, avoiding repeats until the library runs out of unheard
   * material.
   */
  async next(queue: PlaybackQueue, existingItems: PlaybackQueueItem[], batchSize: number): Promise<string[]> {
    const queuedTrackIds = existingItems.map((item) => item.mediaId)
    const fresh = await this.trackSelection.randomTracks(queue, batchSize, queuedTrackIds)

    if (fresh.length >= batchSize) {
      return fresh
    }

    const repeats = await this.trackSelection.randomTracks(queue, batchSize - fresh.length, [])
    return [...fresh, ...repeats]
  }
}
