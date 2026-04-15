import { Injectable } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner, ILike } from 'typeorm'

import { MusicArtist } from './music-artist.entity'
import { MusicArtistMetadata } from './music-artist-metadata.entity'

import { EventService } from '../event/event.service'

import { GetMusicArtistsDto } from './dtos/GetMusicArtists.dto'
import { sortableString, isNumeric } from '../../utils/string'
import { LibraryService } from '../library/library.service'

@Injectable()
export class MusicArtistService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(MusicArtist)
    private musicArtistRepository: Repository<MusicArtist>,
    @InjectRepository(MusicArtistMetadata)
    private musicArtistMetadataRepository: Repository<MusicArtistMetadata>,
    private readonly libraryService: LibraryService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Returns the total number of music artists.
   */
  async count(): Promise<number> {
    return this.musicArtistRepository.count()
  }

  /**
   * Gets a single music artist.
   */
  async get(id: number | string, relations = {}): Promise<MusicArtist | null> {
    const where = isNumeric(id)
      ? { id: id as number }
      : { musicArtistId: id as string }

    const musicArtist = await this.musicArtistRepository.find({
      where,
      relations: {
        ...relations,
      },
    })

    if (!musicArtist.length) {
      return null
    }

    return musicArtist[0]
  }

  /**
   * Gets a single music artist by name.
   */
  async getByName(name: string, relations = {}): Promise<MusicArtist | null> {
    const artists = await this.musicArtistRepository.find({
      where: {
        name: ILike(name),
      },
      relations: {
        ...relations,
      },
    })

    if (!artists.length) {
      return null
    }

    return artists[0]
  }

  /**
   * Returns all artists according to the query.
   */
  async query(getMusicArtistsDto: GetMusicArtistsDto): Promise<[MusicArtist[], number]> {
    const {
      take,
      skip,
      order,
      orderBy,
      tracks,
      releases,
      metadata,
      libraries,
    } = getMusicArtistsDto

    const qb = this.musicArtistRepository.createQueryBuilder('musicArtist')

    if (metadata) qb.leftJoinAndSelect('musicArtist.metadata', 'metadata')
    if (releases) qb.leftJoinAndSelect('musicArtist.releases', 'releases')
    if (tracks) qb.leftJoinAndSelect('musicArtist.tracks', 'tracks')

    // When filtering by library, join files
    if (libraries && libraries.length) {
      const libraryEntities = await this.libraryService.getLibraries(libraries)
      if (!tracks) qb.leftJoin('musicArtist.tracks', 'tracks')
      qb.innerJoin('tracks.file', ...this.libraryService.createJoinArgs(libraryEntities))
    }

    qb
      .orderBy(`musicArtist.${orderBy}`, order)
      .take(take)
      .skip(skip)

    return qb.getManyAndCount()
  }

  /**
   * Creates a new music artist in the database.
   */
  async create(name, queryRunner?: QueryRunner): Promise<MusicArtist> {
    const initial = {
      name,
      sortName: sortableString(name),
    }

    if (queryRunner) {
      return await queryRunner.manager.save(MusicArtist, initial)
    } else {
      return await this.musicArtistRepository.save(initial)
    }
  }
}
