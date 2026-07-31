import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Brackets, In } from 'typeorm'

import { PlaybackQueue } from '../playback-queue.entity'
import { PlaybackQueueItem } from '../playback-queue-item.entity'

import { LibraryService } from '../../library/library.service'
import { MusicHistory } from '../../music-history/music-history.entity'
import { MusicTrack } from '../../music-track/music-track.entity'
import { MusicTrackService } from '../../music-track/music-track.service'
import { applyReleasedSince } from '../../music-track/released-since.util'
import { Rating } from '../../rating/rating.entity'
import { FAVORITE_THRESHOLD } from '../../rating/rating.service'

// How many of the most recently queued tracks seed the next related batch
const RELATED_TAIL_SIZE = 5

// The widest net that the relatedness scoring will rank in one pass
const CANDIDATE_POOL_SIZE = 500

const SHARED_ARTIST_SCORE = 3
const SHARED_GENRE_SCORE = 2
const MAX_RATING_SCORE = 2.5
const PLAY_COUNT_SCORE = 0.3
const MAX_SCORED_PLAYS = 5

/**
 * TrackSelection is the shared machinery that the dynamic queue types build
 * their batches out of: the seed's own tracks, tracks related to a set of
 * tracks, the tracks the user has neglected, and plain randomness.
 */
@Injectable()
export class TrackSelection {
  constructor(
    @InjectRepository(MusicTrack)
    private musicTrackRepository: Repository<MusicTrack>,

    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,

    @InjectRepository(MusicHistory)
    private musicHistoryRepository: Repository<MusicHistory>,

    private readonly libraryService: LibraryService,
    private readonly musicTrackService: MusicTrackService,
  ) {}

  /**
   * Returns the seed's tracks in playing order. A release seed yields its own
   * tracks in album order; an artist seed yields the artist's whole catalogue,
   * newest release first, which is the order the Music app treats as "play".
   */
  async getSeedTracks(queue: PlaybackQueue): Promise<MusicTrack[]> {
    if (!queue.seedMediaId) {
      return []
    }

    if (queue.seedMediaType === 'music_artist') {
      return await this.musicTrackRepository.find({
        where: {
          artists: {
            musicArtistId: queue.seedMediaId,
          },
        },
        order: {
          release: {
            createdAt: 'desc',
          },
          discNumber: 'asc',
          trackNumber: 'asc',
        },
        relations: {
          release: true,
        },
      })
    }

    if (queue.seedMediaType !== 'music_release') {
      return []
    }

    return await this.musicTrackRepository.find({
      where: {
        release: {
          musicReleaseId: queue.seedMediaId,
        },
      },
      order: {
        discNumber: 'asc',
        trackNumber: 'asc',
      },
    })
  }

  /**
   * The next batch for the seeded queue types: tracks related to the most
   * recently queued ones, so the queue drifts naturally instead of looping
   * around its seed forever.
   */
  async nextRelatedTracks(queue: PlaybackQueue, existingItems: PlaybackQueueItem[], batchSize: number): Promise<string[]> {
    const tailTrackIds = existingItems.slice(-RELATED_TAIL_SIZE).map((item) => item.mediaId)

    let seedTracks = await this.musicTrackRepository.find({
      where: {
        musicTrackId: In(tailTrackIds),
      },
    })

    // A queue tail of untracked media can't seed anything; fall back to the original seed
    if (!seedTracks.length) {
      seedTracks = await this.getSeedTracks(queue)
    }

    return await this.generateRelatedBatch(queue, seedTracks, batchSize, existingItems.map((item) => item.mediaId), true)
  }

  /**
   * Produces a batch of related tracks, topped up with random tracks when the
   * library doesn't have enough related material. Repeats are a last resort for
   * refills, where the alternative is playback running dry — a freshly created
   * queue simply starts smaller instead.
   */
  async generateRelatedBatch(
    queue: PlaybackQueue,
    seedTracks: MusicTrack[],
    count: number,
    excludeTrackIds: string[],
    allowRepeats = false,
  ): Promise<string[]> {
    if (count <= 0) {
      return []
    }

    const batch = await this.moreTracksLike(queue, seedTracks, count, excludeTrackIds)

    if (batch.length < count) {
      const fresh = await this.randomTracks(queue, count - batch.length, [...excludeTrackIds, ...batch])
      batch.push(...fresh)
    }

    if (allowRepeats && batch.length < count) {
      const repeats = await this.randomTracks(queue, count - batch.length, [])
      batch.push(...repeats)
    }

    return batch
  }

  /**
   * Orders tracks by how little the user has played them, unplayed first, with
   * ties broken randomly so that repeat visits don't dig up the same run.
   */
  async leastPlayedFirst(
    tracks: MusicTrack[],
    count: number,
    excludeTrackIds: string[],
  ): Promise<string[]> {
    if (count <= 0 || !tracks.length) {
      return []
    }

    const excluded = new Set(excludeTrackIds)
    const candidates = tracks.filter((track) => !excluded.has(track.musicTrackId))

    if (!candidates.length) {
      return []
    }

    const playCounts = await this.musicTrackService.getPlayCounts(candidates.map((track) => track.id))

    return candidates
      .map((track) => ({ track, plays: playCounts.get(track.id) || 0, jitter: Math.random() }))
      .sort((a, b) => a.plays - b.plays || a.jitter - b.jitter)
      .slice(0, count)
      .map((scored) => scored.track.musicTrackId)
  }

  /**
   * The user's most played tracks since the cutoff, restricted to the queue's
   * libraries. Only tracks with at least `minPlays` plays in the window qualify,
   * so a lone accidental play cannot anchor a whole session.
   */
  async mostPlayedSince(queue: PlaybackQueue, cutoff: Date, minPlays: number, limit: number): Promise<MusicTrack[]> {
    const playsQuery = this.musicHistoryRepository
      .createQueryBuilder('history')
      .select('history.track_id', 'trackId')
      .addSelect('COUNT(history.id)', 'plays')
      .where('history.created_at >= :cutoff', { cutoff })
      .groupBy('history.track_id')
      .having('COUNT(history.id) >= :minPlays', { minPlays })
      .orderBy('plays', 'DESC')
      .limit(limit)

    if (queue.user) {
      playsQuery.andWhere('history.user_id = :userId', { userId: queue.user.id })
    }

    const rows = await playsQuery.getRawMany()
    const trackIds = rows.map((row) => parseInt(row.trackId, 10)).filter((id) => !isNaN(id))

    if (!trackIds.length) {
      return []
    }

    const tracksQuery = this.musicTrackRepository
      .createQueryBuilder('music_track')
      .where('music_track.id IN (:...trackIds)', { trackIds })

    if (queue?.libraries?.length) {
      tracksQuery.innerJoin('music_track.file', ...this.libraryService.createJoinArgs(queue.libraries))
    }

    return await tracksQuery.getMany()
  }

  /**
   * One random track that the user has favorited, restricted to the queue's
   * libraries. Returns null when the user has no reachable favorites.
   */
  async randomFavoriteTrack(queue: PlaybackQueue): Promise<MusicTrack | null> {
    if (!queue.user) {
      return null
    }

    const favorites = await this.ratingRepository.find({
      select: {
        mediaId: true,
      },
      where: {
        mediaType: 'music_track',
        rating: FAVORITE_THRESHOLD,
        user: {
          id: queue.user.id,
        },
      },
    })

    if (!favorites.length) {
      return null
    }

    const favoriteQuery = this.musicTrackRepository
      .createQueryBuilder('music_track')
      .where('music_track.musicTrackId IN (:...favoriteIds)', { favoriteIds: favorites.map((favorite) => favorite.mediaId) })
      .orderBy('RANDOM()')
      .limit(1)

    if (queue?.libraries?.length) {
      favoriteQuery.innerJoin('music_track.file', ...this.libraryService.createJoinArgs(queue.libraries))
    }

    return await favoriteQuery.getOne()
  }

  /**
   * Returns up to `count` random track ids whose metadata says they were
   * released in real life on or after the cutoff, restricted to the queue's
   * libraries. Play counts are irrelevant here.
   */
  async freshTracks(queue: PlaybackQueue, cutoffIso: string, count: number, excludeTrackIds: string[]): Promise<string[]> {
    if (count <= 0) {
      return []
    }

    const freshQuery = this.musicTrackRepository
      .createQueryBuilder('music_track')
      .select(['music_track.musicTrackId'])
      .orderBy('RANDOM()')
      .limit(count)

    applyReleasedSince(freshQuery, 'music_track', cutoffIso)

    if (excludeTrackIds.length) {
      freshQuery.andWhere('music_track.musicTrackId NOT IN (:...excludeTrackIds)', { excludeTrackIds })
    }

    if (queue?.libraries?.length) {
      freshQuery.innerJoin(
        'music_track.file',
        ...this.libraryService.createJoinArgs(queue.libraries),
      )
    }

    const tracks = await freshQuery.getMany()
    return tracks.map((track) => track.musicTrackId)
  }

  /**
   * Returns up to `count` random track ids, restricted to the queue's libraries.
   */
  async randomTracks(queue: PlaybackQueue, count: number, excludeTrackIds: string[]): Promise<string[]> {
    if (count <= 0) {
      return []
    }

    const randomTracksQuery = this.musicTrackRepository
      .createQueryBuilder('music_track')
      .select(['music_track.musicTrackId'])
      .orderBy('RANDOM()')
      .limit(count)

    if (excludeTrackIds.length) {
      randomTracksQuery.where('music_track.musicTrackId NOT IN (:...excludeTrackIds)', { excludeTrackIds })
    }

    if (queue?.libraries?.length) {
      randomTracksQuery.innerJoin(
        'music_track.file',
        ...this.libraryService.createJoinArgs(queue.libraries),
      )
    }

    const tracks = await randomTracksQuery.getMany()
    return tracks.map((track) => track.musicTrackId)
  }

  /**
   * The relatedness engine. Returns up to `count` tracks that fit in with the
   * seed tracks, best fits first.
   *
   * A candidate shares an artist or a genre with the seeds, and is scored by
   * that proximity plus how much the user has favorited and listened to it,
   * with some jitter so that two identical queues don't play out identically.
   */
  private async moreTracksLike(
    queue: PlaybackQueue,
    seedTracks: MusicTrack[],
    count: number,
    excludeTrackIds: string[],
  ): Promise<string[]> {
    if (count <= 0 || !seedTracks.length) {
      return []
    }

    const seeds = await this.musicTrackRepository.find({
      where: {
        id: In(seedTracks.map((track) => track.id)),
      },
      relations: {
        artists: true,
        release: {
          genres: true,
        },
      },
    })

    const seedArtistIds = [...new Set(seeds.flatMap((track) => track.artists?.map((artist) => artist.id) || []))]
    const seedGenreIds = [...new Set(seeds.flatMap((track) => track.release?.genres?.map((genre) => genre.id) || []))]

    if (!seedArtistIds.length && !seedGenreIds.length) {
      return []
    }

    const candidatesQuery = this.musicTrackRepository
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.artists', 'artist')
      .leftJoinAndSelect('track.release', 'release')
      .leftJoinAndSelect('release.genres', 'genre')
      .where(new Brackets((related) => {
        if (seedArtistIds.length) {
          related.orWhere('artist.id IN (:...seedArtistIds)', { seedArtistIds })
        }
        if (seedGenreIds.length) {
          related.orWhere('genre.id IN (:...seedGenreIds)', { seedGenreIds })
        }
      }))
      .take(CANDIDATE_POOL_SIZE)

    if (excludeTrackIds.length) {
      candidatesQuery.andWhere('track.musicTrackId NOT IN (:...excludeTrackIds)', { excludeTrackIds })
    }

    if (queue?.libraries?.length) {
      candidatesQuery.innerJoin('track.file', ...this.libraryService.createJoinArgs(queue.libraries))
    }

    const candidates = await candidatesQuery.getMany()

    if (!candidates.length) {
      return []
    }

    const ratings = queue.user
      ? await this.ratingRepository.find({
          where: {
            mediaType: 'music_track',
            mediaId: In(candidates.map((track) => track.musicTrackId)),
            user: {
              id: queue.user.id,
            },
          },
        })
      : []
    const ratingByTrackId = new Map(ratings.map((rating) => [rating.mediaId, rating.rating]))
    const playCounts = await this.musicTrackService.getPlayCounts(candidates.map((track) => track.id))

    const scored = candidates.map((track) => {
      const sharedArtist = track.artists?.some((artist) => seedArtistIds.includes(artist.id))
      const sharedGenre = track.release?.genres?.some((genre) => seedGenreIds.includes(genre.id))
      const rating = ratingByTrackId.get(track.musicTrackId) || 0
      const plays = playCounts.get(track.id) || 0

      const score = (sharedArtist ? SHARED_ARTIST_SCORE : 0)
        + (sharedGenre ? SHARED_GENRE_SCORE : 0)
        + Math.min(rating / 2, MAX_RATING_SCORE)
        + Math.min(plays, MAX_SCORED_PLAYS) * PLAY_COUNT_SCORE
        + Math.random()

      return { track, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((scoredTrack) => scoredTrack.track.musicTrackId)
  }
}
