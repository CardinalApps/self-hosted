import { Injectable } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'

import { MusicArtist } from './music-artist.entity'
import { MusicArtistMetadata } from './music-artist-metadata.entity'

import { EventService } from '../event/event.service'

import { GetMusicArtistsDto } from './dtos/GetMusicArtists.dto'
import { sortableString, isNumeric } from '../../utils/string'

@Injectable()
export class MusicArtistService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(MusicArtist)
    private musicArtistRepository: Repository<MusicArtist>,
    @InjectRepository(MusicArtistMetadata)
    private musicArtistMetadataRepository: Repository<MusicArtistMetadata>,
    private readonly eventService: EventService,
  ) {}

  /**
   * Returns the total number of music artists.
   */
  async count(): Promise<number> {
    const result = await this.musicArtistRepository.findAndCount({
      take: 1,
      skip: 0,
    })

    return result?.[1] || 0
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
        name: name,
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
    const { take, skip, order, orderBy, tracks, releases, metadata } = getMusicArtistsDto
    return await this.musicArtistRepository.findAndCount({
      take,
      skip,
      relations: {
        tracks: tracks,
        releases: releases,
        metadata: metadata,
      },
      order: {
        [orderBy]: order,
      },
    })
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
