import { Injectable } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, QueryRunner } from 'typeorm'

import { MusicGenre } from './music-genre.entity'

import { EventService } from '../event/event.service'

@Injectable()
export class MusicGenreService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(MusicGenre)
    private musicGenreRepository: Repository<MusicGenre>,
    private readonly eventService: EventService,
  ) {}

  /**
   * Returns the total number of music genres.
   */
  async count(): Promise<number> {
    const result = await this.musicGenreRepository.findAndCount({
      take: 1,
      skip: 0,
    })

    return result?.[1] || 0
  }

  /**
   * Gets a single music genre.
   */
  async get(id: number, relations = {}): Promise<MusicGenre | null> {
    const musicGenre = await this.musicGenreRepository.find({
      where: {
        id: id,
      },
      relations: {
        ...relations,
      },
    })

    if (!musicGenre.length) {
      return null
    }

    return musicGenre[0]
  }

  /**
   * Gets a single music genre by name.
   */
  async getByName(name: string, relations = {}): Promise<MusicGenre | null> {
    const genre = await this.musicGenreRepository.find({
      where: {
        name: name,
      },
      relations: {
        ...relations,
      },
    })

    if (!genre.length) {
      return null
    }

    return genre[0]
  }

  /**
   * Creates a new music genre in the database.
   */
  async create(name, queryRunner?: QueryRunner): Promise<MusicGenre> {
    const initial = {
      name,
    }

    if (queryRunner) {
      return await queryRunner.manager.save(MusicGenre, initial)
    } else {
      return await this.musicGenreRepository.save(initial)
    }
  }
}
