import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { And, LessThanOrEqual, MoreThan, Repository } from 'typeorm'
import * as ms from 'ms'

import { getSubscription, SubscriptionTierSlug } from '@cardinalapps/products/dist/cjs/subscriptions'

import { popularityAPI } from '../../utils/cloud'

import { MusicHistory } from '../music-history/music-history.entity'

// MusicBrainz recording IDs are UUIDs; a malformed tag would get the whole batch rejected
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Sends anonymized play batches to the cloud Popularity Data Pool.
 *
 * The Media Server never stores cloud JWTs at rest (by design), so there is no
 * background schedule here. Instead, cloud-authenticated requests donate their
 * in-flight token: the first request after the send interval has elapsed
 * triggers one batch, off the request's critical path.
 */
@Injectable()
export class PopularityService {
  constructor(
    @InjectRepository(MusicHistory)
    private musicHistoryRepository: Repository<MusicHistory>,
  ) {}

  // The PDP rejects batches beyond this size
  private maxBatchSize = 2000

  // The PDP rejects plays older than 48 hours; stay inside that bound
  private maxPlayAge = ms('47h')

  /* Deliberately NOT env-configurable: an env var would make it trivial to set
     an enormous interval and consume the data pool without contributing to it. */
  private sendInterval = ms('15m')

  private inFlight = false

  /* The end of the last attempted window, and the start of the next one.
     Initialized to boot time — plays that happened while the process was down
     are deliberately dropped rather than backfilled. */
  private windowStart = new Date()

  /**
   * Called with every cloud-authenticated request. Sends at most one batch per
   * interval, only for accounts whose subscription provides the feature.
   * Never throws and never blocks the caller.
   */
  maybeSend(cloudJWT: string, cloudUser: Record<string, unknown>): void {
    if (this.inFlight) {
      return
    }
    if (Date.now() - this.windowStart.getTime() < this.sendInterval) {
      return
    }

    const slug = typeof cloudUser?.subscription === 'string'
      ? cloudUser.subscription as `${SubscriptionTierSlug}`
      : null
    if (!slug || getSubscription(slug)?.provides.popularity_data_pool !== true) {
      return
    }

    this.inFlight = true
    this.sendBatch(cloudJWT)
      .catch((error) => {
        Logger.warn(`Could not send plays to the Popularity Data Pool: ${error?.message ?? error}`, 'Popularity')
      })
      .finally(() => {
        this.inFlight = false
      })
  }

  /**
   * Collects the window's plays, normalizes them down to
   * `{ recordingId, playedAt }`, and posts them. The window always advances,
   * even on failure — a missed batch is dropped, never retried.
   */
  private async sendBatch(cloudJWT: string): Promise<void> {
    const windowEnd = new Date()
    const windowStart = new Date(Math.max(this.windowStart.getTime(), windowEnd.getTime() - this.maxPlayAge))
    this.windowStart = windowEnd

    const entries = await this.musicHistoryRepository.find({
      where: {
        createdAt: And(MoreThan(windowStart), LessThanOrEqual(windowEnd)),
      },
      relations: {
        track: {
          metadata: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
      take: this.maxBatchSize,
    })

    // Everything else about the play (user, device, file, local IDs) is dropped here
    const plays = entries
      .map((entry) => ({
        recordingId: entry.track?.metadata
          ?.find((meta) => meta.metaKey === 'musicbrainz_recordingid' && UUID_SHAPE.test(String(meta.metaValue ?? '')))
          ?.metaValue ?? null,
        playedAt: entry.createdAt.toISOString(),
      }))
      .filter((play): play is { recordingId: string, playedAt: string } => !!play.recordingId)

    if (plays.length === 0) {
      return
    }

    await popularityAPI('/api/collect', 'POST', {
      JWT: cloudJWT,
      body: { plays },
    })

    Logger.log(`Sent ${plays.length} plays to the Popularity Data Pool.`, 'Popularity')
  }
}
