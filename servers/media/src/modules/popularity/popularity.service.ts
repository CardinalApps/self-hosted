import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { And, LessThanOrEqual, MoreThan, Repository } from 'typeorm'
import * as ms from 'ms'

import { getSubscription, SubscriptionTierSlug } from '@cardinalapps/products/dist/cjs/subscriptions'

import { popularityAPI } from '../../utils/cloud'
import { CardinalApp } from '../../utils/apps'

import { SettingsService } from '../settings/settings.service'

import { MusicHistory } from '../music-history/music-history.entity'
import { PopularityStats } from './popularity-stats.entity'

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
    @InjectRepository(PopularityStats)
    private popularityStatsRepository: Repository<PopularityStats>,
    private settingsService: SettingsService,
  ) {}

  // The PDP rejects batches beyond this size
  private maxBatchSize = 2000

  // The PDP rejects plays older than 48 hours; stay inside that bound
  private maxPlayAge = ms('47h')

  /* Deliberately NOT env-configurable: an env var would make it trivial to set
     an enormous interval and consume the data pool without contributing to it. */
  private sendInterval = ms('15m')

  private inFlight = false

  /* The end of the last attempted window, and the start of the next one. Null
     means "not collecting": from boot until the first eligible cloud request,
     and again whenever the service is observed disabled. Because a window can
     only open at "now", no batch can ever span time when the service was off
     or when no cloud-capable session was around. */
  private windowStart: Date | null = null

  /* Throttles settings reads while the window is null, since a null window
     cannot throttle through the send interval. */
  private lastNullWindowCheck = 0

  /**
   * Called with every cloud-authenticated request. Sends at most one batch per
   * interval, only for accounts whose subscription provides the feature.
   * Never throws and never blocks the caller.
   */
  maybeSend(cloudJWT: string, cloudUser: Record<string, unknown>): void {
    if (this.inFlight) {
      return
    }
    if (this.windowStart) {
      if (Date.now() - this.windowStart.getTime() < this.sendInterval) {
        return
      }
    } else if (Date.now() - this.lastNullWindowCheck < this.sendInterval) {
      return
    }

    const slug = typeof cloudUser?.subscription === 'string'
      ? cloudUser.subscription as `${SubscriptionTierSlug}`
      : null
    if (!slug || getSubscription(slug)?.provides.popularity_data_pool !== true) {
      return
    }

    this.inFlight = true
    this.advanceWindow(cloudJWT)
      .catch((error) => {
        Logger.warn(`Could not send plays to the Popularity Data Pool: ${error?.message ?? error}`, 'Popularity')
      })
      .finally(() => {
        this.inFlight = false
      })
  }

  /**
   * Resolves the window state against the setting: resets to null while
   * disabled, opens a fresh window on the first request after boot or
   * re-enabling, and otherwise sends the batch.
   */
  private async advanceWindow(cloudJWT: string): Promise<void> {
    const enabled = await this.settingsService.get(CardinalApp.ADMIN, 'enable_popularity_data_pool')

    if (enabled !== true) {
      this.windowStart = null
      this.lastNullWindowCheck = Date.now()
      return
    }

    if (this.windowStart === null) {
      this.windowStart = new Date()
      return
    }

    await this.sendBatch(cloudJWT, this.windowStart)
  }

  /**
   * Collects the window's plays, normalizes them down to
   * `{ recordingId, playedAt }`, and posts them. The window always advances,
   * even on failure — a missed batch is dropped, never retried.
   */
  private async sendBatch(cloudJWT: string, lastWindowEnd: Date): Promise<void> {
    const windowEnd = new Date()
    const windowStart = new Date(Math.max(lastWindowEnd.getTime(), windowEnd.getTime() - this.maxPlayAge))
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

    await this.recordContribution(plays.length)

    Logger.log(`Sent ${plays.length} plays to the Popularity Data Pool.`, 'Popularity')
  }

  // Adds successfully sent plays to the lifetime counter
  private async recordContribution(count: number): Promise<void> {
    const stats = (await this.popularityStatsRepository.find({ take: 1 }))[0]
      ?? this.popularityStatsRepository.create({ playsContributed: 0 })

    stats.playsContributed += count
    await this.popularityStatsRepository.save(stats)
  }

  /**
   * This server's lifetime contribution stats.
   */
  async getStats(): Promise<{ playsContributed: number }> {
    const stats = (await this.popularityStatsRepository.find({ take: 1 }))[0]
    return { playsContributed: stats?.playsContributed ?? 0 }
  }
}
