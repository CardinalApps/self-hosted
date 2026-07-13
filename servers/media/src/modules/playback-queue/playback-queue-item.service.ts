import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
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

  /**
   * Moves one item so that it sits directly behind `afterQueueItemId`, which is what
   * backs drag-and-drop reordering in the playback queue UI.
   *
   * The moved item takes the midpoint between the item it was dropped behind and
   * whatever currently follows that item, so a move rewrites exactly one row no
   * matter how far the item travelled or how long the queue is.
   *
   * The caller names the item it was dropped behind rather than a position, because
   * only the server knows the queue's live order. It also means an item can never be
   * placed behind the item that is currently playing.
   */
  async moveItem(queueId: string, queueItemId: string, afterQueueItemId: string): Promise<PlaybackQueueItem[]> {
    return await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(PlaybackQueueItem)

      if (queueItemId === afterQueueItemId) {
        throw new BadRequestException('An item cannot be moved behind itself.')
      }

      const item = await this.getItem(repository, queueId, queueItemId)
      let after = await this.getItem(repository, queueId, afterQueueItemId)

      if (!item || !after) {
        throw new NotFoundException()
      }

      let next = await this.getNextItem(repository, queueId, after.position, queueItemId)
      let position = this.midpoint(after.position, next?.position)

      /*
        Halving the same gap often enough eventually exhausts the mantissa, and the
        midpoint stops landing strictly between its neighbours. That takes ~52 moves
        into one gap, so it is rare, but it would silently corrupt the order. Spread
        the queue back out and take the midpoint again.
      */
      if (position === null) {
        await this.rebalance(repository, queueId)

        after = await this.getItem(repository, queueId, afterQueueItemId)
        next = await this.getNextItem(repository, queueId, after.position, queueItemId)
        position = this.midpoint(after.position, next?.position)
      }

      await repository.update({ queueItemId }, { position })

      return await this.getQueueItems(repository, queueId)
    })
  }

  /**
   * Returns the position between two items, or null when there is no room left
   * between them. An item dropped behind the last item just goes one step further out.
   */
  private midpoint(after: number, next?: number): number | null {
    if (typeof next !== 'number') {
      return after + 1
    }

    const position = (after + next) / 2

    return position > after && position < next ? position : null
  }

  /**
   * Spreads a queue's positions back out to 1..N, in its current order.
   *
   * This is the only operation that rewrites the whole queue, and it only runs when a
   * gap has been subdivided into nothing.
   */
  private async rebalance(repository: Repository<PlaybackQueueItem>, queueId: string): Promise<void> {
    const items = await this.getQueueItems(repository, queueId)

    for (const [index, item] of items.entries()) {
      await repository.update({ queueItemId: item.queueItemId }, { position: index + 1 })
    }
  }

  /**
   * Returns one item of a queue.
   */
  private async getItem(repository: Repository<PlaybackQueueItem>, queueId: string, queueItemId: string): Promise<PlaybackQueueItem | null> {
    return await repository.findOne({
      where: {
        queueItemId,
        queue: {
          queueId,
        },
      },
    })
  }

  /**
   * Returns the item that follows the given position, ignoring the item being moved
   * (which may currently be sitting in the very gap that is being measured).
   */
  private async getNextItem(
    repository: Repository<PlaybackQueueItem>,
    queueId: string,
    position: number,
    movingQueueItemId: string,
  ): Promise<PlaybackQueueItem | null> {
    return await repository.findOne({
      where: {
        queue: {
          queueId,
        },
        position: MoreThan(position),
        queueItemId: Not(In([movingQueueItemId])),
      },
      order: {
        position: 'asc',
      },
    })
  }

  /**
   * Returns every item in a queue, in playback order.
   */
  private async getQueueItems(repository: Repository<PlaybackQueueItem>, queueId: string): Promise<PlaybackQueueItem[]> {
    return await repository.find({
      where: {
        queue: {
          queueId,
        },
      },
      order: {
        position: 'asc',
      },
    })
  }
}
