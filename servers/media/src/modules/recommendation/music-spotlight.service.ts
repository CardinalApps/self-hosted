import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { MusicArtist } from '../music-artist/music-artist.entity'
import { MusicTrack } from '../music-track/music-track.entity'
import { MusicHistory } from '../music-history/music-history.entity'
import { Rating, RatingMediaType } from '../rating/rating.entity'
import { User } from '../user/user.entity'
import { DynamicQueueType } from '../playback-queue/dtos/CreatePlaybackQueue'

import { MusicArtistSpotlight, MusicSpotlightReason, MusicSpotlightReasonKind } from './types'

// How far back a play still counts as heavy rotation, and how many plays it takes
const HEAVY_ROTATION_DAYS = 30
const HEAVY_ROTATION_MIN_PLAYS = 5

// How much history makes an artist worth rediscovering, and how long they must have sat idle
const REDISCOVER_MIN_PLAYS = 10
const REDISCOVER_IDLE_DAYS = 90

// How far back a favorite still reads as a recent signal
const FAVORITED_DAYS = 60

/* The queue the spotlight's play button should start. Reasons about neglect lead into Undertow
   (least-played first); reasons about affection lead into House Mix (most-played first). */
const REASON_QUEUE_TYPES: Record<MusicSpotlightReasonKind, DynamicQueueType> = {
  heavy_rotation: 'house_mix',
  favorited_track: 'house_mix',
  rediscover: 'undertow',
  unplayed: 'undertow',
  library_pick: 'house_mix',
}

// Aggregate counts come back as strings on Postgres and numbers on SQLite
const toInt = (value: unknown): number => {
  const parsed = parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

// Timestamps come back as a Date on Postgres and a string on SQLite
const toIsoOrNull = (value: unknown): string | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

// Deterministic 32-bit FNV-1a hash, so the same seed string always lands on the same pick
const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

type SpotlightCandidate = {
  musicArtistId: string
  name: string
  trackTitle?: string
  lastPlayedAt?: string
}

type ReasonPool = {
  kind: MusicSpotlightReasonKind
  candidates: SpotlightCandidate[]
}

/**
 * Picks the artist for the Listen Now spotlight, along with the reason it was
 * picked. The pick is stable for a calendar day per user, and rolls over to a
 * fresh one the next day.
 */
@Injectable()
export class MusicSpotlightService {
  constructor(
    @InjectRepository(MusicArtist)
    private musicArtistRepository: Repository<MusicArtist>,

    @InjectRepository(MusicHistory)
    private musicHistoryRepository: Repository<MusicHistory>,

    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
  ) {}

  /**
   * The spotlighted artist for this user today, or null for a library with no
   * artist that could carry the hero block.
   */
  async getArtistSpotlight(user?: User): Promise<MusicArtistSpotlight | null> {
    const eligible = await this.getEligibleArtists()

    if (!eligible.length) {
      return null
    }

    const daySeed = `${user?.userId ?? 'anonymous'}:${new Date().toISOString().slice(0, 10)}`
    const pools = user ? await this.buildReasonPools(eligible, user) : []
    const nonEmpty = pools.filter((pool) => pool.candidates.length)

    // No listening signals to reason from; fall back to a stable pick from the whole library
    if (!nonEmpty.length) {
      return this.toSpotlight('library_pick', this.pickCandidate(eligible, `${daySeed}:library_pick`))
    }

    const pool = nonEmpty[fnv1a(daySeed) % nonEmpty.length]
    return this.toSpotlight(pool.kind, this.pickCandidate(pool.candidates, `${daySeed}:${pool.kind}`))
  }

  /**
   * Artists that can carry the block: named, and with at least one release
   * that has both cover art (the hero image) and playable tracks.
   */
  private async getEligibleArtists(): Promise<SpotlightCandidate[]> {
    const rows = await this.musicArtistRepository
      .createQueryBuilder('artist')
      .innerJoin('artist.releases', 'release')
      .innerJoin('release.thumbnails', 'thumbnail')
      .innerJoin('release.tracks', 'track')
      .where('artist.name IS NOT NULL')
      .select('artist.musicArtistId', 'musicArtistId')
      .addSelect('artist.name', 'name')
      .groupBy('artist.musicArtistId')
      .addGroupBy('artist.name')
      .getRawMany()

    return rows.map((row) => ({
      musicArtistId: String(row.musicArtistId ?? ''),
      name: String(row.name ?? ''),
    }))
  }

  /**
   * One pool of candidates per reason, all cut down to the eligible artists.
   */
  private async buildReasonPools(eligible: SpotlightCandidate[], user: User): Promise<ReasonPool[]> {
    const [allPlays, recentPlays, recentFavorites] = await Promise.all([
      this.getPlaysByArtist(user),
      this.getPlaysByArtist(user, daysAgo(HEAVY_ROTATION_DAYS)),
      this.getRecentFavorites(user),
    ])

    const rediscoverCutoff = daysAgo(REDISCOVER_IDLE_DAYS)

    const heavyRotation: SpotlightCandidate[] = []
    const rediscover: SpotlightCandidate[] = []
    const unplayed: SpotlightCandidate[] = []
    const favorited: SpotlightCandidate[] = []

    for (const artist of eligible) {
      const played = allPlays.get(artist.musicArtistId)
      const recent = recentPlays.get(artist.musicArtistId)
      const favorite = recentFavorites.get(artist.musicArtistId)

      if (recent && recent.plays >= HEAVY_ROTATION_MIN_PLAYS) {
        heavyRotation.push(artist)
      }

      if (favorite) {
        favorited.push({ ...artist, trackTitle: favorite })
      }

      /* Unplayed is only a signal once the user has a listening record; with no plays at all,
         every artist is unplayed and the library_pick fallback is the honest framing. */
      if (!played && allPlays.size) {
        unplayed.push(artist)
      } else if (
        played
        && played.plays >= REDISCOVER_MIN_PLAYS
        && played.lastPlayedAt
        && new Date(played.lastPlayedAt) < rediscoverCutoff
      ) {
        rediscover.push({ ...artist, lastPlayedAt: played.lastPlayedAt })
      }
    }

    return [
      { kind: 'heavy_rotation', candidates: heavyRotation },
      { kind: 'favorited_track', candidates: favorited },
      { kind: 'rediscover', candidates: rediscover },
      { kind: 'unplayed', candidates: unplayed },
    ]
  }

  /**
   * The user's play count and most recent play per artist, optionally counting
   * only plays after a cutoff.
   */
  private async getPlaysByArtist(user: User, since?: Date): Promise<Map<string, { plays: number, lastPlayedAt: string | null }>> {
    const query = this.musicHistoryRepository
      .createQueryBuilder('history')
      .innerJoin('history.track', 'track')
      .innerJoin('track.artists', 'artist')
      .where('history.user_id = :userId', { userId: user.id })
      .select('artist.musicArtistId', 'musicArtistId')
      .addSelect('COUNT(history.id)', 'plays')
      .addSelect('MAX(history.createdAt)', 'lastPlayedAt')
      .groupBy('artist.musicArtistId')

    if (since) {
      query.andWhere('history.createdAt >= :since', { since })
    }

    const rows = await query.getRawMany()

    return new Map(rows.map((row) => [
      String(row.musicArtistId ?? ''),
      { plays: toInt(row.plays), lastPlayedAt: toIsoOrNull(row.lastPlayedAt) },
    ]))
  }

  /**
   * The title of the most recently favorited track per artist, within the
   * recency window. Ratings key on the public track ID, so this joins on
   * musicTrackId instead of a relation.
   */
  private async getRecentFavorites(user: User): Promise<Map<string, string>> {
    const rows = await this.ratingRepository
      .createQueryBuilder('rating')
      .innerJoin(MusicTrack, 'track', 'track.music_track_id = rating.media_id')
      .innerJoin('track.artists', 'artist')
      .where('rating.user_id = :userId', { userId: user.id })
      .andWhere('rating.media_type = :mediaType', { mediaType: RatingMediaType.MUSIC_TRACK })
      .andWhere('rating.created_at >= :since', { since: daysAgo(FAVORITED_DAYS) })
      .select('artist.musicArtistId', 'musicArtistId')
      .addSelect('track.title', 'trackTitle')
      .addSelect('rating.createdAt', 'favoritedAt')
      .orderBy('rating.createdAt', 'ASC')
      .getRawMany()

    // Ascending order, so the newest favorite per artist wins the map slot
    const favorites = new Map<string, string>()

    for (const row of rows) {
      const musicArtistId = String(row.musicArtistId ?? '')
      if (musicArtistId && row.trackTitle) {
        favorites.set(musicArtistId, String(row.trackTitle))
      }
    }

    return favorites
  }

  /**
   * A deterministic pick from the pool: sorted for stability, indexed by hash.
   */
  private pickCandidate(candidates: SpotlightCandidate[], seed: string): SpotlightCandidate {
    const sorted = [...candidates].sort((a, b) => a.musicArtistId.localeCompare(b.musicArtistId))
    return sorted[fnv1a(seed) % sorted.length]
  }

  /**
   * Shapes the winning candidate into the API response.
   */
  private toSpotlight(kind: MusicSpotlightReasonKind, candidate: SpotlightCandidate): MusicArtistSpotlight {
    const reason: MusicSpotlightReason = { kind }

    if (kind === 'favorited_track' && candidate.trackTitle) {
      reason.trackTitle = candidate.trackTitle
    }

    if (kind === 'rediscover' && candidate.lastPlayedAt) {
      reason.lastPlayedAt = candidate.lastPlayedAt
    }

    return {
      musicArtistId: candidate.musicArtistId,
      name: candidate.name,
      reason,
      queueType: REASON_QUEUE_TYPES[kind],
    }
  }
}
