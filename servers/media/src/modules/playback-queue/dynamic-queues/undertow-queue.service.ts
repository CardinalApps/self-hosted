import { Injectable, Logger } from '@nestjs/common'

import { PlaybackQueue } from '../playback-queue.entity'
import { PlaybackQueueItem } from '../playback-queue-item.entity'
import { DynamicQueueType } from '../dtos/CreatePlaybackQueue'

import { DynamicQueue } from './types'
import { TrackSelection } from './track-selection.service'

const INIT_BATCH = 40

/**
 * Undertow drags up the parts of the seed that the user has never got around
 * to: least-played first, unplayed tracks ahead of everything else. It is the
 * counterweight to House Mix, which leans on what is already popular.
 */
@Injectable()
export class UndertowQueue implements DynamicQueue {
  readonly dynamicType: DynamicQueueType = 'undertow'
  readonly requiresSeed = true

  constructor(private readonly trackSelection: TrackSelection) {}

  /**
   * The most neglected corner of the seed, first.
   */
  async init(queue: PlaybackQueue): Promise<string[]> {
    const seedTracks = await this.trackSelection.getSeedTracks(queue)

    if (!seedTracks.length) {
      Logger.warn('An undertow queue was created for a seed with no tracks', 'UndertowQueue')
      return []
    }

    return await this.trackSelection.leastPlayedFirst(seedTracks, INIT_BATCH, [])
  }

  /**
   * Whatever is still unheard in the seed, and once the seed is exhausted it
   * drifts outward to related tracks the same way the other seeded types do.
   */
  async next(queue: PlaybackQueue, existingItems: PlaybackQueueItem[], batchSize: number): Promise<string[]> {
    const queuedTrackIds = existingItems.map((item) => item.mediaId)
    const seedTracks = await this.trackSelection.getSeedTracks(queue)
    const buried = await this.trackSelection.leastPlayedFirst(seedTracks, batchSize, queuedTrackIds)

    if (buried.length >= batchSize) {
      return buried
    }

    const related = await this.trackSelection.nextRelatedTracks(queue, existingItems, batchSize - buried.length)
    return [...buried, ...related]
  }
}
