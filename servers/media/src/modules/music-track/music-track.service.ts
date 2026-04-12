import { Injectable } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'

import { MusicTrack, MusicTrackComputed } from './music-track.entity'
import { MusicTrackMetadata } from './music-track-metadata.entity'
import { File } from '../indexing/entities/file.entity'

import { EventService } from '../event/event.service'

import { GetMusicTracksDto } from './dtos/GetMusicTracks.dto'
import { LibraryService } from '../library/library.service'
import { MusicHistory } from '../music-history/music-history.entity'
import { Rating } from '../rating/rating.entity'
import { User } from '../user/user.entity'

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
        where: { user: { id: user.id }, track: { id: track.id } },
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
    } = getMusicTracksDto

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

    // Join pre-aggregated play counts in a single pass rather than a
    // correlated subquery per row.
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

    // Join the current user's rating if a user is provided
    if (user) {
      qb.addSelect((subQuery) =>
        subQuery
          .select('rating.rating', 'rating')
          .from(Rating, 'rating')
          .where('rating.track_id = music_track.id')
          .andWhere('rating.user_id = :userId', { userId: user.id }),
        'music_track_rating')
    }

    if (orderBy === 'playCount') {
      qb.orderBy('music_track_play_count', order)
    } else if (orderBy === 'rating' && user) {
      qb.orderBy('music_track_rating', order)
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
        playCount: parseInt(raw?.music_track_play_count, 10) || 0,
        rating: raw?.music_track_rating ?? null,
      }
    })

    return [result, count]
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
