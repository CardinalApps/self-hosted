import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, Not, In, MoreThan, LessThan } from 'typeorm'

import { PlaybackQueue } from './playback-queue.entity'
import { PlaybackQueueItem } from './playback-queue-item.entity'

import { EventService } from '../event/event.service'
import { MusicHistory } from '../music-history/music-history.entity'

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
   * Inserts explicit items into a queue, either at the end or directly after the
   * item the user most recently played ("Play Next").
   *
   * The user's position in the queue is resolved from their playback history
   * instead of being sent by the client, so every device agrees on where "next"
   * is — a queue is server-side state, not client-side state.
   */
  async insertItems(
    queue: PlaybackQueue,
    itemsToInsert: Partial<PlaybackQueueItem>[],
    insert: 'next' | 'end',
  ): Promise<PlaybackQueueItem[]> {
    const validItems = itemsToInsert.filter((item) => item.mediaType && item.mediaId)

    if (!validItems.length) {
      throw new BadRequestException('No valid items to insert.')
    }

    return await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(PlaybackQueueItem)

      /*
        Two attempts: when the target gap has been subdivided into nothing, the queue is
        spread back out once and the positions are computed again. A rebalanced queue
        always has room, so the second attempt cannot fail.
      */
      for (let attempt = 0; attempt < 2; attempt++) {
        let anchor: PlaybackQueueItem | null = null

        if (insert === 'next') {
          const lastPlayed = await manager.getRepository(MusicHistory).findOne({
            where: {
              queueItem: {
                queue: {
                  id: queue.id,
                },
              },
            },
            relations: {
              queueItem: true,
            },
            order: {
              updatedAt: 'desc',
            },
          })
          anchor = lastPlayed?.queueItem ?? null
        }

        // 'end', or 'next' when nothing in this queue was played yet
        if (!anchor) {
          anchor = await repository.findOne({
            where: {
              queue: {
                id: queue.id,
              },
            },
            order: {
              position: 'desc',
            },
          })
        }

        const next = anchor
          ? await this.getNextItem(repository, queue.queueId, anchor.position, anchor.queueItemId)
          : null

        let cursor = anchor?.position ?? 0
        const positions: number[] = []

        for (let i = 0; i < validItems.length; i++) {
          const position = this.midpoint(cursor, next?.position)
          if (position === null) {
            break
          }
          positions.push(position)
          cursor = position
        }

        if (positions.length < validItems.length) {
          await this.rebalance(repository, queue.queueId)
          continue
        }

        const created = validItems.map((item, index) => ({
          queue,
          mediaType: item.mediaType,
          mediaId: item.mediaId,
          position: positions[index],
        }))

        await repository.insert(created)

        return created as PlaybackQueueItem[]
      }

      throw new BadRequestException('The queue has no room for more items.')
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
