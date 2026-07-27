import { Injectable, Logger } from '@nestjs/common'

import { PlaybackQueue } from '../playback-queue.entity'
import { PlaybackQueueItem } from '../playback-queue-item.entity'
import { DynamicQueueType } from '../dtos/CreatePlaybackQueue'

import { DynamicQueue } from './types'
import { TrackSelection } from './track-selection.service'

const INIT_BATCH = 50

/**
 * House Mix always kicks off with a track from the seed release, then blends
 * tracks from nearby artists, genres, and albums, like a radio station that was
 * tuned to the release.
 */
@Injectable()
export class HouseMixQueue implements DynamicQueue {
  readonly dynamicType: DynamicQueueType = 'house_mix'
  readonly requiresSeed = true

  constructor(private readonly trackSelection: TrackSelection) {}

  /**
   * One track of the seed release, followed by the mix it tuned in.
   */
  async init(queue: PlaybackQueue): Promise<string[]> {
    const releaseTracks = await this.trackSelection.getSeedTracks(queue)

    if (!releaseTracks.length) {
      Logger.warn('A house_mix queue was created for a release with no tracks', 'HouseMixQueue')
      return []
    }

    const kickoff = releaseTracks[Math.floor(Math.random() * releaseTracks.length)]
    const mix = await this.trackSelection.generateRelatedBatch(queue, releaseTracks, INIT_BATCH - 1, [kickoff.musicTrackId])

    return [kickoff.musicTrackId, ...mix]
  }

  /**
   * The mix keeps drifting outward from whatever it most recently queued.
   */
  async next(queue: PlaybackQueue, existingItems: PlaybackQueueItem[], batchSize: number): Promise<string[]> {
    return await this.trackSelection.nextRelatedTracks(queue, existingItems, batchSize)
  }
}
