import { Injectable, Logger } from '@nestjs/common'

import { PlaybackQueue } from '../playback-queue.entity'
import { PlaybackQueueItem } from '../playback-queue-item.entity'
import { DynamicQueueType } from '../dtos/CreatePlaybackQueue'
import { MusicTrack } from '../../music-track/music-track.entity'

import { DynamicQueue } from './types'
import { TrackSelection } from './track-selection.service'

const INIT_BATCH = 50

/*
  A seedless House Mix picks its own seed from the user's heavy rotation: one of
  the SELF_SEED_POOL_SIZE most played tracks of the past SELF_SEED_WINDOW_DAYS,
  counting only tracks played at least SELF_SEED_MIN_PLAYS times.
*/
const SELF_SEED_WINDOW_DAYS = 7
const SELF_SEED_MIN_PLAYS = 3
const SELF_SEED_POOL_SIZE = 10

/**
 * House Mix always kicks off with a track from the seed release, then blends
 * tracks from nearby artists, genres, and albums, like a radio station that was
 * tuned to the release. Created without a seed, it seeds itself from the user's
 * recent listening, then a favorite, then plain randomness.
 */
@Injectable()
export class HouseMixQueue implements DynamicQueue {
  readonly dynamicType: DynamicQueueType = 'house_mix'
  readonly requiresSeed = false

  constructor(private readonly trackSelection: TrackSelection) {}

  /**
   * One track of the seed, followed by the mix it tuned in.
   */
  async init(queue: PlaybackQueue): Promise<string[]> {
    let seedTracks = await this.trackSelection.getSeedTracks(queue)

    if (queue.seedMediaId && !seedTracks.length) {
      Logger.warn('A house_mix queue was created for a seed with no tracks', 'HouseMixQueue')
      return []
    }

    if (!seedTracks.length) {
      const selfSeed = await this.pickSelfSeed(queue)
      seedTracks = selfSeed ? [selfSeed] : []
    }

    if (!seedTracks.length) {
      return await this.trackSelection.randomTracks(queue, INIT_BATCH, [])
    }

    const kickoff = seedTracks[Math.floor(Math.random() * seedTracks.length)]
    const mix = await this.trackSelection.generateRelatedBatch(queue, seedTracks, INIT_BATCH - 1, [kickoff.musicTrackId])

    return [kickoff.musicTrackId, ...mix]
  }

  /**
   * The mix keeps drifting outward from whatever it most recently queued.
   */
  async next(queue: PlaybackQueue, existingItems: PlaybackQueueItem[], batchSize: number): Promise<string[]> {
    return await this.trackSelection.nextRelatedTracks(queue, existingItems, batchSize)
  }

  /**
   * The seed for a seedless mix: a heavy rotation track from the past week,
   * else one of the user's favorites, else null.
   */
  private async pickSelfSeed(queue: PlaybackQueue): Promise<MusicTrack | null> {
    const cutoff = new Date(Date.now() - SELF_SEED_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const heavyRotation = await this.trackSelection.mostPlayedSince(queue, cutoff, SELF_SEED_MIN_PLAYS, SELF_SEED_POOL_SIZE)

    if (heavyRotation.length) {
      return heavyRotation[Math.floor(Math.random() * heavyRotation.length)]
    }

    return await this.trackSelection.randomFavoriteTrack(queue)
  }
}
