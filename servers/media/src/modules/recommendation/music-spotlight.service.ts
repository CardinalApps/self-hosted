import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { MusicArtist } from '../music-artist/music-artist.entity'
import { MusicRelease } from '../music-release/music-release.entity'
import { MusicTrack } from '../music-track/music-track.entity'
import { MusicHistory } from '../music-history/music-history.entity'
import { Rating, RatingMediaType } from '../rating/rating.entity'
import { User } from '../user/user.entity'
import { DynamicQueueType } from '../playback-queue/dtos/CreatePlaybackQueue'

import {
  MusicArtistSpotlight,
  MusicReleaseSpotlight,
  MusicSpotlightReason,
  MusicSpotlightReasonKind,
  MusicTrackSpotlight,
} from './types'

// How much history makes a pick worth rediscovering, and how long it must have sat idle
const REDISCOVER_MIN_PLAYS = 10
const REDISCOVER_IDLE_DAYS = 90

// How far back a favorite still reads as a recent signal
const FAVORITED_DAYS = 60

/* The queue the spotlight's play button should start. Reasons about neglect lead into Undertow
   (least-played first); reasons about affection lead into House Mix (most-played first). */
const ARTIST_REASON_QUEUE_TYPES: Record<MusicSpotlightReasonKind, DynamicQueueType> = {
  heavy_rotation: 'house_mix',
  favorited_track: 'house_mix',
  rediscover: 'undertow',
  unplayed: 'undertow',
  library_pick: 'house_mix',
}

/* A release can't be Undertowed, so neglect leads into an Encore instead: the way to meet a
   release you've never heard, or haven't heard in months, is to play it front to back. */
const RELEASE_REASON_QUEUE_TYPES: Record<MusicSpotlightReasonKind, DynamicQueueType> = {
  heavy_rotation: 'house_mix',
  favorited_track: 'house_mix',
  rediscover: 'encore',
  unplayed: 'encore',
  library_pick: 'encore',
}

/* What counts as a signal, per scope. Tracks are played far more often than whole artists or
   releases are, so their heavy rotation is the sharper "on repeat this week" rather than a
   month-long habit, and a lone track isn't something you rediscover. */
const SCOPE_SIGNALS: Record<SpotlightScope, {
  heavyRotationDays: number,
  heavyRotationMinPlays: number,
  kinds: MusicSpotlightReasonKind[],
}> = {
  artist: {
    heavyRotationDays: 30,
    heavyRotationMinPlays: 5,
    kinds: ['heavy_rotation', 'favorited_track', 'rediscover', 'unplayed'],
  },
  release: {
    heavyRotationDays: 30,
    heavyRotationMinPlays: 5,
    kinds: ['heavy_rotation', 'favorited_track', 'rediscover', 'unplayed'],
  },
  track: {
    heavyRotationDays: 7,
    heavyRotationMinPlays: 3,
    kinds: ['heavy_rotation', 'favorited_track', 'unplayed'],
  },
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

/** Which media the spotlight is about. All three walk the same reasons over different rows. */
type SpotlightScope = 'artist' | 'release' | 'track'

type SpotlightCandidate = {
  // The public ID of the artist, release or track
  id: string

  // The artist's name, or the release's or track's title
  name: string

  trackTitle?: string
  lastPlayedAt?: string

  // The artist behind a release or track candidate
  artistName?: string
  musicArtistId?: string

  // The release a track candidate belongs to, which carries its hero image
  musicReleaseId?: string
  releaseTitle?: string
}

type ReasonPool = {
  kind: MusicSpotlightReasonKind
  candidates: SpotlightCandidate[]
}

type SpotlightPick = {
  kind: MusicSpotlightReasonKind
  candidate: SpotlightCandidate
}

/**
 * Picks the artist and the release for the Listen Now spotlights, along with
 * the reason each was picked. The picks are stable for a calendar day per
 * user, and roll over to fresh ones the next day.
 */
@Injectable()
export class MusicSpotlightService {
  constructor(
    @InjectRepository(MusicArtist)
    private musicArtistRepository: Repository<MusicArtist>,

    @InjectRepository(MusicRelease)
    private musicReleaseRepository: Repository<MusicRelease>,

    @InjectRepository(MusicTrack)
    private musicTrackRepository: Repository<MusicTrack>,

    @InjectRepository(MusicHistory)
    private musicHistoryRepository: Repository<MusicHistory>,

    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
  ) {}

  /**
   * The spotlighted artist at one position of this user's daily sequence, or
   * null once the sequence has run dry.
   */
  async getArtistSpotlight(user?: User, position = 0): Promise<MusicArtistSpotlight | null> {
    const pick = await this.getSpotlightPick('artist', user, position)

    if (!pick) {
      return null
    }

    return {
      musicArtistId: pick.candidate.id,
      name: pick.candidate.name,
      reason: this.toReason(pick),
      queueType: ARTIST_REASON_QUEUE_TYPES[pick.kind],
    }
  }

  /**
   * The spotlighted release at one position of this user's daily sequence, or
   * null once the sequence has run dry. Runs its own sequence, so it can land
   * on the same artist the artist spotlight did.
   */
  async getReleaseSpotlight(user?: User, position = 0): Promise<MusicReleaseSpotlight | null> {
    const pick = await this.getSpotlightPick('release', user, position)

    if (!pick) {
      return null
    }

    return {
      musicReleaseId: pick.candidate.id,
      title: pick.candidate.name,
      artistName: pick.candidate.artistName ?? null,
      musicArtistId: pick.candidate.musicArtistId ?? null,
      reason: this.toReason(pick),
      queueType: RELEASE_REASON_QUEUE_TYPES[pick.kind],
    }
  }

  /**
   * The spotlighted track at one position of this user's daily sequence, or
   * null once the sequence has run dry. Runs its own sequence, independent of
   * the artist and release spotlights.
   */
  async getTrackSpotlight(user?: User, position = 0): Promise<MusicTrackSpotlight | null> {
    const pick = await this.getSpotlightPick('track', user, position)

    if (!pick) {
      return null
    }

    return {
      musicTrackId: pick.candidate.id,
      title: pick.candidate.name,
      artistName: pick.candidate.artistName ?? null,
      musicArtistId: pick.candidate.musicArtistId ?? null,
      musicReleaseId: pick.candidate.musicReleaseId ?? null,
      releaseTitle: pick.candidate.releaseTitle ?? null,
      reason: this.toReason(pick),
    }
  }

  /**
   * Walks the day's deterministic sequence for one scope up to the requested
   * position, or returns null once it runs dry.
   */
  private async getSpotlightPick(scope: SpotlightScope, user?: User, position = 0): Promise<SpotlightPick | null> {
    const eligible = await this.getEligible(scope)

    if (!eligible.length) {
      return null
    }

    const daySeed = `${user?.userId ?? 'anonymous'}:${scope}:${new Date().toISOString().slice(0, 10)}`
    const pools = user ? await this.buildReasonPools(scope, eligible, user) : []
    const signalPools = pools.filter((pool) => pool.candidates.length)

    const usedKinds = new Set<MusicSpotlightReasonKind>()
    const usedIds = new Set<string>()

    /* Every step takes a reason and a pick that no earlier step has used, so a page of
       spotlights never repeats either; library_pick serves once as the final filler, then
       the sequence runs dry. */
    for (let step = 0; ; step++) {
      const available = signalPools
        .filter((pool) => !usedKinds.has(pool.kind))
        .map((pool) => ({
          ...pool,
          candidates: pool.candidates.filter((candidate) => !usedIds.has(candidate.id)),
        }))
        .filter((pool) => pool.candidates.length)

      let kind: MusicSpotlightReasonKind
      let candidate: SpotlightCandidate

      if (available.length) {
        const pool = available[fnv1a(`${daySeed}:${step}`) % available.length]
        kind = pool.kind
        candidate = this.pickCandidate(pool.candidates, `${daySeed}:${step}:${pool.kind}`)
      } else if (!usedKinds.has('library_pick')) {
        const remaining = eligible.filter((candidate) => !usedIds.has(candidate.id))

        if (!remaining.length) {
          return null
        }

        kind = 'library_pick'
        candidate = this.pickCandidate(remaining, `${daySeed}:${step}:library_pick`)
      } else {
        return null
      }

      if (step === position) {
        return { kind, candidate }
      }

      usedKinds.add(kind)
      usedIds.add(candidate.id)
    }
  }

  /**
   * The rows one scope can pick from.
   */
  private async getEligible(scope: SpotlightScope): Promise<SpotlightCandidate[]> {
    if (scope === 'artist') {
      return await this.getEligibleArtists()
    }

    if (scope === 'release') {
      return await this.getEligibleReleases()
    }

    return await this.getEligibleTracks()
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
      .select('artist.musicArtistId', 'id')
      .addSelect('artist.name', 'name')
      .groupBy('artist.musicArtistId')
      .addGroupBy('artist.name')
      .getRawMany()

    return rows.map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
    }))
  }

  /**
   * Releases that can carry the block: titled, with cover art for the hero and
   * playable tracks.
   */
  private async getEligibleReleases(): Promise<SpotlightCandidate[]> {
    const rows = await this.musicReleaseRepository
      .createQueryBuilder('release')
      .innerJoin('release.thumbnails', 'thumbnail')
      .innerJoin('release.tracks', 'track')
      .leftJoin('release.artist', 'artist')
      .where('release.title IS NOT NULL')
      .select('release.musicReleaseId', 'id')
      .addSelect('release.title', 'name')
      .addSelect('artist.name', 'artistName')
      .addSelect('artist.musicArtistId', 'musicArtistId')
      .groupBy('release.musicReleaseId')
      .addGroupBy('release.title')
      .addGroupBy('artist.name')
      .addGroupBy('artist.musicArtistId')
      .getRawMany()

    return rows.map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      ...(row.artistName ? { artistName: String(row.artistName) } : {}),
      ...(row.musicArtistId ? { musicArtistId: String(row.musicArtistId) } : {}),
    }))
  }

  /**
   * Tracks that can carry the block: titled, and on a release with the cover
   * art that becomes the hero image.
   */
  private async getEligibleTracks(): Promise<SpotlightCandidate[]> {
    const rows = await this.musicTrackRepository
      .createQueryBuilder('track')
      .innerJoin('track.release', 'release')
      .innerJoin('release.thumbnails', 'thumbnail')
      .leftJoin('release.artist', 'artist')
      .where('track.title IS NOT NULL')
      .select('track.musicTrackId', 'id')
      .addSelect('track.title', 'name')
      .addSelect('release.musicReleaseId', 'musicReleaseId')
      .addSelect('release.title', 'releaseTitle')
      .addSelect('artist.name', 'artistName')
      .addSelect('artist.musicArtistId', 'musicArtistId')
      .groupBy('track.musicTrackId')
      .addGroupBy('track.title')
      .addGroupBy('release.musicReleaseId')
      .addGroupBy('release.title')
      .addGroupBy('artist.name')
      .addGroupBy('artist.musicArtistId')
      .getRawMany()

    return rows.map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      ...(row.musicReleaseId ? { musicReleaseId: String(row.musicReleaseId) } : {}),
      ...(row.releaseTitle ? { releaseTitle: String(row.releaseTitle) } : {}),
      ...(row.artistName ? { artistName: String(row.artistName) } : {}),
      ...(row.musicArtistId ? { musicArtistId: String(row.musicArtistId) } : {}),
    }))
  }

  /**
   * One pool of candidates per reason, all cut down to the eligible picks.
   */
  private async buildReasonPools(scope: SpotlightScope, eligible: SpotlightCandidate[], user: User): Promise<ReasonPool[]> {
    const signals = SCOPE_SIGNALS[scope]

    const [allPlays, recentPlays, recentFavorites] = await Promise.all([
      this.getPlays(scope, user),
      this.getPlays(scope, user, daysAgo(signals.heavyRotationDays)),
      this.getRecentFavorites(scope, user),
    ])

    const rediscoverCutoff = daysAgo(REDISCOVER_IDLE_DAYS)

    const heavyRotation: SpotlightCandidate[] = []
    const rediscover: SpotlightCandidate[] = []
    const unplayed: SpotlightCandidate[] = []
    const favorited: SpotlightCandidate[] = []

    for (const candidate of eligible) {
      const played = allPlays.get(candidate.id)
      const recent = recentPlays.get(candidate.id)
      const favorite = recentFavorites.get(candidate.id)

      if (recent && recent.plays >= signals.heavyRotationMinPlays) {
        heavyRotation.push(candidate)
      }

      /* A track spotlight is the favorited track, so naming it in the reason would only
         repeat the title the block already shows. */
      if (favorite) {
        favorited.push(scope === 'track' ? candidate : { ...candidate, trackTitle: favorite })
      }

      /* Unplayed is only a signal once the user has a listening record; with no plays at all,
         everything is unplayed and the library_pick fallback is the honest framing. */
      if (!played && allPlays.size) {
        unplayed.push(candidate)
      } else if (
        played
        && played.plays >= REDISCOVER_MIN_PLAYS
        && played.lastPlayedAt
        && new Date(played.lastPlayedAt) < rediscoverCutoff
      ) {
        rediscover.push({ ...candidate, lastPlayedAt: played.lastPlayedAt })
      }
    }

    const pools: ReasonPool[] = [
      { kind: 'heavy_rotation', candidates: heavyRotation },
      { kind: 'favorited_track', candidates: favorited },
      { kind: 'rediscover', candidates: rediscover },
      { kind: 'unplayed', candidates: unplayed },
    ]

    return pools.filter((pool) => signals.kinds.includes(pool.kind))
  }

  /**
   * The user's play count and most recent play per artist or release,
   * optionally counting only plays after a cutoff.
   */
  private async getPlays(scope: SpotlightScope, user: User, since?: Date): Promise<Map<string, { plays: number, lastPlayedAt: string | null }>> {
    const query = this.musicHistoryRepository
      .createQueryBuilder('history')
      .innerJoin('history.track', 'track')
      .where('history.user_id = :userId', { userId: user.id })

    if (scope === 'artist') {
      query
        .innerJoin('track.artists', 'artist')
        .select('artist.musicArtistId', 'id')
        .groupBy('artist.musicArtistId')
    } else if (scope === 'release') {
      query
        .innerJoin('track.release', 'release')
        .select('release.musicReleaseId', 'id')
        .groupBy('release.musicReleaseId')
    } else {
      query
        .select('track.musicTrackId', 'id')
        .groupBy('track.musicTrackId')
    }

    query
      .addSelect('COUNT(history.id)', 'plays')
      .addSelect('MAX(history.createdAt)', 'lastPlayedAt')

    if (since) {
      query.andWhere('history.createdAt >= :since', { since })
    }

    const rows = await query.getRawMany()

    return new Map(rows.map((row) => [
      String(row.id ?? ''),
      { plays: toInt(row.plays), lastPlayedAt: toIsoOrNull(row.lastPlayedAt) },
    ]))
  }

  /**
   * The title of the most recently favorited track per artist or release,
   * within the recency window. Ratings key on the public track ID, so this
   * joins on musicTrackId instead of a relation.
   */
  private async getRecentFavorites(scope: SpotlightScope, user: User): Promise<Map<string, string>> {
    const query = this.ratingRepository
      .createQueryBuilder('rating')
      .innerJoin(MusicTrack, 'track', 'track.music_track_id = rating.media_id')
      .where('rating.user_id = :userId', { userId: user.id })
      .andWhere('rating.media_type = :mediaType', { mediaType: RatingMediaType.MUSIC_TRACK })
      .andWhere('rating.created_at >= :since', { since: daysAgo(FAVORITED_DAYS) })

    if (scope === 'artist') {
      query
        .innerJoin('track.artists', 'artist')
        .select('artist.musicArtistId', 'id')
    } else if (scope === 'release') {
      query
        .innerJoin('track.release', 'release')
        .select('release.musicReleaseId', 'id')
    } else {
      query.select('track.musicTrackId', 'id')
    }

    const rows = await query
      .addSelect('track.title', 'trackTitle')
      .addSelect('rating.createdAt', 'favoritedAt')
      .orderBy('rating.createdAt', 'ASC')
      .getRawMany()

    // Ascending order, so the newest favorite per pick wins the map slot
    const favorites = new Map<string, string>()

    for (const row of rows) {
      const id = String(row.id ?? '')
      if (id && row.trackTitle) {
        favorites.set(id, String(row.trackTitle))
      }
    }

    return favorites
  }

  /**
   * A deterministic pick from the pool: sorted for stability, indexed by hash.
   */
  private pickCandidate(candidates: SpotlightCandidate[], seed: string): SpotlightCandidate {
    const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id))
    return sorted[fnv1a(seed) % sorted.length]
  }

  /**
   * The reason, with only the params that belong to its kind.
   */
  private toReason({ kind, candidate }: SpotlightPick): MusicSpotlightReason {
    const reason: MusicSpotlightReason = { kind }

    if (kind === 'favorited_track' && candidate.trackTitle) {
      reason.trackTitle = candidate.trackTitle
    }

    if (kind === 'rediscover' && candidate.lastPlayedAt) {
      reason.lastPlayedAt = candidate.lastPlayedAt
    }

    return reason
  }
}
