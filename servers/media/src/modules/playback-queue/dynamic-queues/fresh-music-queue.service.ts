import { Injectable } from '@nestjs/common'

import { PlaybackQueue } from '../playback-queue.entity'
import { PlaybackQueueItem } from '../playback-queue-item.entity'
import { DynamicQueueType } from '../dtos/CreatePlaybackQueue'

import { freshCutoffIso } from '../../music-track/released-since.util'

import { DynamicQueue } from './types'
import { TrackSelection } from './track-selection.service'

const INIT_BATCH = 50

/**
 * Fresh plays music that was recently released in real life, according to the
 * files' own release date metadata, regardless of play count. Unlike the other
 * dynamic types it is finite: refills drain what the library has, and when no
 * fresh material is left the queue simply ends.
 */
@Injectable()
export class FreshMusicQueue implements DynamicQueue {
  readonly dynamicType: DynamicQueueType = 'fresh_music'
  readonly requiresSeed = false

  constructor(private readonly trackSelection: TrackSelection) {}

  /**
   * A Fresh queue opens with a random spread of the library's fresh tracks.
   */
  async init(queue: PlaybackQueue): Promise<string[]> {
    return await this.trackSelection.freshTracks(queue, freshCutoffIso(), INIT_BATCH, [])
  }

  /**
   * More fresh tracks that are not already queued. Returns nothing once the
   * library's fresh material is exhausted, which ends the queue.
   */
  async next(queue: PlaybackQueue, existingItems: PlaybackQueueItem[], batchSize: number): Promise<string[]> {
    const queuedTrackIds = existingItems.map((item) => item.mediaId)
    return await this.trackSelection.freshTracks(queue, freshCutoffIso(), batchSize, queuedTrackIds)
  }
}
