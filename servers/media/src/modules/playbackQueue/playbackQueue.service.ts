import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'

import { Queue } from './playbackQueue.entity'

import { EventService } from '../event/event.service'
import { User } from '../user/user.entity'

import { QueryPlaybackQueuesDto } from './dtos/QueryPlaybackQueue.dto'
import { CreatePlaybackQueueDto } from './dtos/CreatePlaybackQueue'

@Injectable()
export class QueueService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(Queue)
    private queueRepository: Repository<Queue>,
    private readonly eventService: EventService,
  ) {}

  /**
   * Create a queue.
   */
  async create(createQueueDto: CreatePlaybackQueueDto, user: User): Promise<Queue> {
    const { type } = createQueueDto
    try {
      return await this.queueRepository.save({
        type,
        user,
      })
    } catch (error) {
      Logger.log(error)
    }
  }

  /**
   * Gets a single queue.
   */
  async get(id: number | string): Promise<Queue | null> {
    const where: Partial<Queue> = typeof id === 'number' ? { id: id } : { queueId: id }

    const queue = await this.queueRepository.find({
      where,
      relations: {
        user: true,
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
  async query(queryInvitationsDto: QueryPlaybackQueuesDto): Promise<[Queue[], number]> {
    const { take, skip, order, sort, type } = queryInvitationsDto

    return await this.queueRepository.findAndCount({
      take,
      skip,
      where: {
        ...(type ? { type } : {}),
      },
      relations: {
        user: true,
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
    const where: Partial<Queue> = typeof id === 'number' ? { id: id } : { queueId: id }

    const invite = await this.queueRepository.delete(where)

    return !!invite.affected
  }
}
