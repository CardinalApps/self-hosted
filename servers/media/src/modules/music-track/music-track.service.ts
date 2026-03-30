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

    // Calculate play count
    qb.addSelect((subQuery) =>
      subQuery
        .select('COUNT(history.id)', 'count')
        .from(MusicHistory, 'history')
        .where('history.track_id = music_track.id'),
      'music_track_play_count')

    qb
      .orderBy(`music_track.${orderBy}`, order)
      .take(take)
      .skip(skip)

    if (orderBy === 'playCount') {
      qb.orderBy('music_track_play_count', order)
    }

    // playCount requires manual mapping
    const count = await qb.getCount()
    const withRaw = await qb.getRawAndEntities()
    const result = withRaw.entities.map((track, index) => {
      return {
        ...track,
        playCount: parseInt(withRaw.raw[index]?.music_track_play_count, 10) || 0,
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
