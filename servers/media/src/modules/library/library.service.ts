import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, In } from 'typeorm'

import { Library } from './library.entity'

import { EventService } from '../event/event.service'
import { User } from '../user/user.entity'
import { envVar } from '../../utils/env'

@Injectable()
export class LibraryService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,
    private readonly eventService: EventService,
  ) {}

  /**
   * Creates a new library.
   */
  async createLibrary(name = 'New Library', user: User, paths: string[]): Promise<Library> {
    if (!paths.length) {
      throw new BadRequestException('Cannot create library without a path')
    }

    const library = await this.libraryRepository.save({
      name,
      user,
      paths,
    })

    return library
  }

  /**
   * Returns the total number of libraries.
   */
  async countLibraries(): Promise<number> {
    const result = await this.libraryRepository.findAndCount({
      take: 1,
      skip: 0,
    })

    return result?.[1] || 0
  }

  /**
   * Get a library.
   */
  async getLibrary(id: number | string): Promise<Library | null> {
    const where = typeof id === 'number' ? { id: id } : { libraryId: id }

    const library = await this.libraryRepository.findOne({
      where,
      relations: {
        user: true,
      },
    })

    if (!library) {
      return null
    }

    return library
  }

  /**
   * Query libraries.
   */
  async getLibraries(libraryIds: string[]): Promise<Library[]> {
    return await this.libraryRepository.find({
      where: {
        libraryId: In(libraryIds),
      },
      relations: {
        user: true,
      },
    })
  }

  /**
   * Updates a library.
   */
  async updateLibrary(id, update: Partial<Library>): Promise<Library | null> {
    const result = await this.libraryRepository.update(id, update)

    if (result?.affected !== 1) {
      Logger.error(`Error updating library ${id}`, 'Libraries')
      return null
    }

    return await this.getLibrary(id)
  }

  /**
   * Deletes one or more libraries.
   */
  async deleteLibraries(ids: number | number[]): Promise<boolean> {
    if (!Array.isArray(ids)) {
      ids = [ids]
    }

    const deleted = await this.libraryRepository.delete(ids)

    if (deleted?.affected === ids.length) {
      return true
    } else {
      Logger.log(`Unexpected amount of libraries. Wanted to delete: (${ids.length}), but deleted (${deleted?.affected}) instead.`, 'Libraries')
      return false
    }
  }

  /**
   * When you want to query media and filter by one or more library, use this to
   * generate all but the first param for TypeORM's *Join() methods. This
   * assumes that the media has a FK named `file`.
   * 
   * Example:
   * 
   *     myQueryBuilder.innerJoin(
   *       'myMediaType.file',
   *       ...this.libraryService.createJoinArgs(libraryEntities),
   *     )
   * 
   * When using Postgres, this will use Postgres's `ANY()` function. When using
   * SQLite, this will create a string of `OR` statements.
   */
  createJoinArgs(libraries: Library[]): [string?, string?, Record<string, string[]>?] {
    const libraryPaths = libraries?.flatMap((library) => {
      return library.paths
    }) || []

    // PG
    if (envVar('CARDINAL_POSTGRES', false)) {
      return [
        'file',
        "file.absolutePath LIKE ANY(:filters)",
        { filters: libraryPaths.map((p) => `${p}%`) },
      ]
    }
    // SQLite
    else {
      return [
        'file',
        `(${libraryPaths.map((_, i) => `file.absolutePath LIKE :p${i}`).join(" OR ")})`,
        libraryPaths.reduce((acc, p, i) => ({
          ...acc,
          [`p${i}`]: `${p}%`,
        }), {}),
      ]
    }
  }
}
