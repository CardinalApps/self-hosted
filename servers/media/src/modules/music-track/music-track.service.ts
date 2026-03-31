import { Injectable } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'

import { MusicTrack } from './music-track.entity'
import { MusicTrackMetadata } from './music-track-metadata.entity'
import { File } from '../indexing/entities/file.entity'

import { EventService } from '../event/event.service'

import { GetMusicTracksDto } from './dtos/GetMusicTracks.dto'
import { LibraryService } from '../library/library.service'
import { MusicHistory } from '../music-history/music-history.entity'

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
  async get(id: number | string, relations = {}): Promise<MusicTrack | null> {
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

    return musicTrack[0]
  }

  async query(getMusicTracksDto: GetMusicTracksDto): Promise<[MusicTrack[], number]> {
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

    if (orderBy === 'playCount') {
      qb.orderBy('music_track_play_count', order)
    } else {
      qb.orderBy(`music_track.${orderBy}`, order)
    }
    qb.take(take).skip(skip)

    const count = await qb.getCount()
    const withRaw = await qb.getRawAndEntities()

    // Map by ID rather than array index — index alignment breaks when M2M
    // joins (e.g. artists) cause TypeORM to produce multiple raw rows per entity.
    const playCountMap = new Map(
      withRaw.raw.map((row) => [row.music_track_id, parseInt(row.music_track_play_count, 10) || 0]),
    )
    const result = withRaw.entities.map((track) => ({
      ...track,
      playCount: playCountMap.get(track.id) ?? 0,
    }))

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
