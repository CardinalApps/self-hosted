import { Injectable } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, Not, In, MoreThan, LessThan } from 'typeorm'

import { PlaybackQueueItem } from './playback-queue-item.entity'

import { EventService } from '../event/event.service'

import { DynamicPlayback } from './dynamic-playback-queue.service'
import { QueryPlaybackQueueItemsDto } from './dtos/QueryPlaybackQueueItem.dto'

@Injectable()
export class QueueItemService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,

    @InjectRepository(PlaybackQueueItem)
    private queueItemRepository: Repository<PlaybackQueueItem>,

    private readonly eventService: EventService,
    private readonly dynamicQueueService: DynamicPlayback,
  ) {}

  /**
   * Returns a slice of items in a queue. Queues are not limited to any size, so
   * the client apps tend to want slices of queues, not always whole queues.
   * This can handle both.
   * 
   * Use `currentQueueItemId` to query from a specific position in the queue.
   * Use `leading` and `trailing` to select items before and after the
   * `currentQueueItemId`.
   * 
   * If no `currentQueueItemId` is given, start from the beginning of the queue.
   */
  async getQueueSlice(queueId: string, queryPlaybackQueueItemsDto: QueryPlaybackQueueItemsDto): Promise<[PlaybackQueueItem[], number]> {
    const {
      trailing,
      leading,
      currentQueueItemId,
      includeCurrentItemInReturn,
    } = queryPlaybackQueueItemsDto

    const sliced: PlaybackQueueItem[] = []

    // Get our starting position
    let currentItem: PlaybackQueueItem

    if (currentQueueItemId) {
      // Use the given ID
      currentItem = await this.queueItemRepository.findOne({
        where: {
          queueItemId: currentQueueItemId,
        },
      })
    } else {
      // Use the first item
      const items = await this.queueItemRepository.find({
        where: {
          queue: {
            queueId,
          },
        },
        take: 1,
        order: {
          position: 'asc',
        },
      })
      currentItem = items?.[0]
    }

    if (!currentItem) {
      return [sliced, 0]
    }

    if (includeCurrentItemInReturn) {
      sliced.push(currentItem)
    }

    // Get the leading queue items (next items from our current position)
    if (leading) {
      const next = await this.queueItemRepository.find({
        where: {
          queue: {
            queueId,
          },
          position: MoreThan(currentItem.position),
          queueItemId: Not(In([currentItem.queueItemId])),
        },
        take: leading,
        order: {
          position: 'asc',
        },
      })

      sliced.push(...next)
    }

    // Get the trailing queue items (previous items from our current position)
    if (trailing) {
      const prev = await this.queueItemRepository.find({
        where: {
          queue: {
            queueId,
          },
          position: LessThan(currentItem.position),
          queueItemId: Not(In([currentItem.queueItemId])),
        },
        take: trailing,
        order: {
          position: 'desc',
        },
      })

      sliced.unshift(...prev)
    }

    const totalInQueue = await this.queueItemRepository.count({
      where: {
        queue: {
          queueId: queueId,
        },
      },
    })

    return [sliced, totalInQueue]
  }
}
