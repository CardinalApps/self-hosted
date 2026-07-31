import { Injectable } from '@nestjs/common'

import { PlaybackQueue } from '../playback-queue.entity'
import { DynamicQueueType } from '../dtos/CreatePlaybackQueue'

import { freshCutoffIso } from '../../music-track/released-since.util'

import { DynamicQueue } from './types'
import { TrackSelection } from './track-selection.service'

/**
 * Fresh Release is Fresh Music narrowed to one album: the server picks a random
 * release that came out in real life within the fresh window and plays it front
 * to back. When the release is over, the queue ends.
 */
@Injectable()
export class FreshReleaseQueue implements DynamicQueue {
  readonly dynamicType: DynamicQueueType = 'fresh_release'
  readonly requiresSeed = false

  constructor(private readonly trackSelection: TrackSelection) {}

  /**
   * One random fresh release, in disc and track order.
   */
  async init(queue: PlaybackQueue): Promise<string[]> {
    const releaseTracks = await this.trackSelection.freshRelease(queue, freshCutoffIso())
    return releaseTracks.map((track) => track.musicTrackId)
  }

  /**
   * A Fresh Release queue is one album long; it never refills.
   */
  async next(): Promise<string[]> {
    return []
  }
}
