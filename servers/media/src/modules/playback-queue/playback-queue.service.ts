import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'

import { PlaybackQueue } from './playback-queue.entity'

import { EventService } from '../event/event.service'
import { User } from '../user/user.entity'

import { QueryPlaybackQueuesDto } from './dtos/QueryPlaybackQueue.dto'
import { CreatePlaybackQueueDto } from './dtos/CreatePlaybackQueue'
import { LibraryService } from '../library/library.service'
import { DynamicPlayback } from './dynamic-playback-queue.service'

@Injectable()
export class QueueService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(PlaybackQueue)
    private queueRepository: Repository<PlaybackQueue>,
    private readonly eventService: EventService,
    private readonly dynamicQueueService: DynamicPlayback,
    private readonly libraryService: LibraryService,
  ) {}

  /**
   * Create a queue.
   */
  async create(createQueueDto: CreatePlaybackQueueDto, user: User): Promise<PlaybackQueue> {
    const { type, dynamicType, libraries } = createQueueDto
    const libraryEntities = libraries
      ? await Promise.all(libraries.map((lib) => this.libraryService.getLibrary(lib.libraryId)))
      : undefined

    try {
      const saved = await this.queueRepository.save({
        user,
        type,
        dynamicType,
        libraries: libraryEntities,
      })

      if (type === 'dynamic') {
        await this.dynamicQueueService.initDynamicQueue(saved)
      }

      return await this.get(saved.id)
    } catch (error) {
      Logger.error(error)
    }
  }

  /**
   * Gets a single queue with all of the necessary joins for the frontend.
   */
  async get(id: number | string): Promise<PlaybackQueue | null> {
    const where = typeof id === 'number' ? { id: id } : { queueId: id }

    const queue = await this.queueRepository.find({
      where,
      relations: {
        user: true,
        libraries: true,
        items: true,
      },
    })

    if (!queue.length) {
      return null
    }

    return queue[0]
  }

  /**
   * Returns all queues according to the query.
   */
  async query(queryPlaybackQueuesDto: QueryPlaybackQueuesDto): Promise<[PlaybackQueue[], number]> {
    const { take, skip, order, sort, type } = queryPlaybackQueuesDto

    return await this.queueRepository.findAndCount({
      take,
      skip,
      where: {
        ...(type ? { type } : {}),
      },
      relations: {
        user: true,
        libraries: true,
      },
      order: {
        [sort]: order,
      },
    })
  }

  /**
   * Delete a queue.
   */
  async delete(id: string | number): Promise<boolean> {
    const where = typeof id === 'number' ? { id: id } : { queueId: id }

    const invite = await this.queueRepository.delete(where)

    return !!invite.affected
  }
}
