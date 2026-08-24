import { Injectable } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'

import { MusicTrack, MusicTrackComputed } from './music-track.entity'
import { MusicTrackMetadata } from './music-track-metadata.entity'
import { File } from '../indexing/entities/file.entity'

import { EventService } from '../event/event.service'

import { GetMusicTracksDto } from './dtos/GetMusicTracks.dto'
import { applyReleasedSince } from './released-since.util'
import { LibraryService } from '../library/library.service'
import { MusicHistory } from '../music-history/music-history.entity'
import { Rating, RatingMediaType } from '../rating/rating.entity'
import { FAVORITE_THRESHOLD } from '../rating/rating.service'
import { User } from '../user/user.entity'

/* What makes a track "hot": the user got through nearly all of it, more than once, recently.
   A near-complete play is the strongest signal the library has that a track was wanted, since
   anything less can be a skip. */
const HOT_MIN_PROGRESS = 0.9
const HOT_MIN_PLAYS = 2
const HOT_WINDOW_DAYS = 14

@Injectable()
export class MusicTrackService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,

    @InjectRepository(MusicTrack)
    private musicTrackRepository: Repository<MusicTrack>,

    @InjectRepository(MusicTrackMetadata)
    private musicTrackMetadataRepository: Repository<MusicTrackMetadata>,

    private readonly libraryService: LibraryService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Returns the total number of music tracks.
   */
  async count(): Promise<number> {
    return this.musicTrackRepository.count()
  }

  /**
   * Gets a single music track.
   */
  async get(id: number | string, relations = {}, user?: User): Promise<MusicTrackComputed | null> {
    const where = typeof id === 'number' ? { id: id } : { musicTrackId: id }

    const musicTrack = await this.musicTrackRepository.find({
      where,
      relations: {
        ...relations,
      },
    })

    if (!musicTrack.length) {
      return null
    }

    const track = musicTrack[0]

    if (user) {
      const ratingRow = await this.dataSource.getRepository(Rating).findOne({
        where: { user: { id: user.id }, mediaType: RatingMediaType.MUSIC_TRACK, mediaId: track.musicTrackId },
      })
      return { ...track, rating: ratingRow?.rating ?? null }
    }

    return track
  }

  async query(getMusicTracksDto: GetMusicTracksDto, user?: User): Promise<[MusicTrackComputed[], number]> {
    const {
      take,
      skip,
      order,
      orderBy,
      metadata,
      release,
      artists,
      libraries,
      playCount,
      rating,
      releasedSince,
      favorites,
      hot,
    } = getMusicTracksDto

    /* Ordering by a computed figure requires computing it, whatever the caller asked for -
       otherwise the sort silently falls back to an arbitrary order. */
    const withPlayCount = playCount || orderBy === 'playCount'
    const withRating = (rating || orderBy === 'rating') && !!user
    const withFavorites = favorites || orderBy === 'favoritedAt'
    const withHot = hot || orderBy === 'hotPlays'

    // Favorites and hot tracks are per-user; without a user there is nothing to return
    if ((withFavorites || withHot) && !user) {
      return [[], 0]
    }

    const qb = this.musicTrackRepository.createQueryBuilder('music_track')

    if (release) qb.leftJoinAndSelect('music_track.release', 'release')
    if (release) qb.leftJoinAndSelect('release.thumbnails', 'thumbnails')
    if (artists) qb.leftJoinAndSelect('music_track.artists', 'artists')
    if (metadata) qb.leftJoinAndSelect('music_track.metadata', 'metadata')

    // When filtering by library, join files
    if (libraries && libraries.length) {
      const libraryEntities = await this.libraryService.getLibraries(libraries)
      qb.innerJoin('music_track.file', ...this.libraryService.createJoinArgs(libraryEntities))
    }

    if (releasedSince) {
      applyReleasedSince(qb, 'music_track', releasedSince)
    }

    // One rating row per user+track, so this join cannot duplicate tracks
    if (withFavorites) {
      qb.innerJoin(
        Rating,
        'favorite',
        'favorite.media_type = :favoriteMediaType AND favorite.media_id = music_track.music_track_id AND favorite.user_id = :favoriteUserId AND favorite.rating = :favoriteThreshold',
        {
          favoriteMediaType: RatingMediaType.MUSIC_TRACK,
          favoriteUserId: user.id,
          favoriteThreshold: FAVORITE_THRESHOLD,
        },
      )
      qb.addSelect('favorite.created_at', 'music_track_favorited_at')
    }

    /* One row per track that clears the bar, so this join both filters the result down to hot
       tracks and carries the count that orders them. */
    if (withHot) {
      qb.innerJoin(
        (subQuery) => subQuery
          .select('history.track_id', 'track_id')
          .addSelect('COUNT(history.id)', 'hot_plays')
          .from(MusicHistory, 'history')
          .where('history.user_id = :hotUserId')
          .andWhere('history.progress >= :hotMinProgress')
          .andWhere('history.created_at >= :hotSince')
          .groupBy('history.track_id')
          .having('COUNT(history.id) >= :hotMinPlays'),
        'hot_plays',
        'hot_plays.track_id = music_track.id',
      )
      qb.addSelect('hot_plays.hot_plays', 'music_track_hot_plays')
      qb.setParameters({
        hotUserId: user.id,
        hotMinProgress: HOT_MIN_PROGRESS,
        hotSince: new Date(Date.now() - HOT_WINDOW_DAYS * 24 * 60 * 60 * 1000),
        hotMinPlays: HOT_MIN_PLAYS,
      })
    }

    // Join pre-aggregated play counts in a single pass rather than a
    // correlated subquery per row.
    if (withPlayCount) {
      qb.leftJoin(
        (subQuery) => subQuery
          .select('history.track_id', 'track_id')
          .addSelect('COUNT(history.id)', 'play_count')
          .from(MusicHistory, 'history')
          .groupBy('history.track_id'),
        'play_counts',
        'play_counts.track_id = music_track.id',
      )
      qb.addSelect('COALESCE(play_counts.play_count, 0)', 'music_track_play_count')
    }

    // Join the current user's rating if a user is provided
    if (withRating) {
      qb.addSelect((subQuery) =>
        subQuery
          .select('rating.rating', 'rating')
          .from(Rating, 'rating')
          .where('rating.media_type = :mediaType', { mediaType: RatingMediaType.MUSIC_TRACK })
          .andWhere('rating.media_id = music_track.music_track_id')
          .andWhere('rating.user_id = :userId', { userId: user.id }),
        'music_track_rating')
    }

    if (orderBy === 'playCount') {
      qb.orderBy('music_track_play_count', order)
    } else if (orderBy === 'rating' && withRating) {
      qb.orderBy('music_track_rating', order)
    } else if (orderBy === 'favoritedAt') {
      qb.orderBy('music_track_favorited_at', order)
    } else if (orderBy === 'hotPlays') {
      qb.orderBy('music_track_hot_plays', order)
    } else {
      qb.orderBy(`music_track.${orderBy}`, order)
    }
    qb.take(take).skip(skip)

    const count = await qb.getCount()
    const withRaw = await qb.getRawAndEntities()

    // Map by ID rather than array index — index alignment breaks when M2M
    // joins (e.g. artists) cause TypeORM to produce multiple raw rows per entity.
    const rawMap = new Map(
      withRaw.raw.map((row) => [row.music_track_id, row]),
    )
    const result = withRaw.entities.map((track) => {
      const raw = rawMap.get(track.id)
      return {
        ...track,
        ...(withPlayCount ? { playCount: parseInt(raw?.music_track_play_count, 10) || 0 } : {}),
        ...(withRating ? { rating: raw?.music_track_rating ?? null } : {}),
      }
    })

    return [result, count]
  }

  /**
   * Returns play counts for a batch of track IDs, keyed by track ID. Tracks
   * with no history are omitted, so callers should default missing entries to 0.
   */
  async getPlayCounts(trackIds: number[]): Promise<Map<number, number>> {
    if (!trackIds.length) {
      return new Map()
    }

    const rows = await this.dataSource
      .getRepository(MusicHistory)
      .createQueryBuilder('history')
      .select('history.track_id', 'trackId')
      .addSelect('COUNT(history.id)', 'playCount')
      .where('history.track_id IN (:...trackIds)', { trackIds })
      .groupBy('history.track_id')
      .getRawMany()

    return new Map(rows.map((row) => [parseInt(row.trackId, 10), parseInt(row.playCount, 10) || 0]))
  }

  /**
   * Creates a new music track entity in the database.
   */
  async create(file: File, queryRunner?: QueryRunner): Promise<MusicTrack> {
    const initial = {
      file,
    }

    if (queryRunner) {
      return await queryRunner.manager.save(MusicTrack, initial)
    } else {
      return await this.musicTrackRepository.save(initial)
    }
  }

  /**
   * Returns recently added music releases.
   */
  // async getRecentlyAddedReleases(): Promise<[, number]> {
  //   return await this.musicTrackRepository.find({
  //     take,
  //     skip,
  //     relations: {
  //       release: release ? { thumbnails: true } : false,
  //       artists: artists,
  //       metadata: metadata,
  //     },
  //     order: {
  //       [sort]: order,
  //     },
  //   })
  // }
}
