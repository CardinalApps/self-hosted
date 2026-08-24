import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'

import { PlaybackQueue } from './playback-queue.entity'

import { EventService } from '../event/event.service'

import { MusicRelease } from '../music-release/music-release.entity'
import { MusicArtist } from '../music-artist/music-artist.entity'
import { PlaybackQueueItem } from './playback-queue-item.entity'
import { PlaybackQueueEvents } from './events'
import { CreatePlaybackQueueDto } from './dtos/CreatePlaybackQueue'
import { DynamicQueueRegistry } from './dynamic-queues/dynamic-queue.registry'

/*
  When a played item has fewer than REFILL_THRESHOLD items after it, the queue
  is topped up with the next REFILL_BATCH items.
*/
const REFILL_THRESHOLD = 10
const REFILL_BATCH = 25

/**
 * The DynamicPlayback class runs the lifecycle of every Queue whose type is
 * `dynamic`. It decides when a queue needs items and writes them, while the
 * service behind the queue's `dynamicType` decides which items those are.
 */
@Injectable()
export class DynamicPlayback implements OnModuleInit {
  // Queues that are currently being extended, so overlapping triggers cannot double-fill
  private extendingQueueIds = new Set<number>()

  constructor(
    @InjectRepository(PlaybackQueue)
    private queueRepository: Repository<PlaybackQueue>,

    @InjectRepository(PlaybackQueueItem)
    private queueItemRepository: Repository<PlaybackQueueItem>,

    @InjectRepository(MusicRelease)
    private musicReleaseRepository: Repository<MusicRelease>,

    @InjectRepository(MusicArtist)
    private musicArtistRepository: Repository<MusicArtist>,

    private readonly eventService: EventService,
    private readonly dynamicQueues: DynamicQueueRegistry,
  ) {}

  // Refills run entirely server side so that every client of a user stays in sync
  onModuleInit() {
    this.eventService.subscribePrivate(this, PlaybackQueueEvents.ITEM_PLAYED, this.onQueueItemPlayed.bind(this))
  }

  /**
   * Throws when a queue creation request needs a seed that is missing or unknown.
   * A seed is validated whenever one is provided, even for types that can seed
   * themselves.
   */
  async validateSeed(createPlaybackQueueDto: CreatePlaybackQueueDto): Promise<void> {
    const { type, dynamicType, seedMediaType, seedMediaId } = createPlaybackQueueDto

    if (type !== 'dynamic') {
      return
    }

    if (!seedMediaType || !seedMediaId) {
      if (this.dynamicQueues.requiresSeed(dynamicType)) {
        throw new BadRequestException(`The ${dynamicType} queue type requires a seed.`)
      }
      return
    }

    if (seedMediaType === 'music_artist') {
      const artist = await this.musicArtistRepository.findOne({
        where: {
          musicArtistId: seedMediaId,
        },
      })

      if (!artist) {
        throw new NotFoundException('The seed artist does not exist.')
      }

      return
    }

    const release = await this.musicReleaseRepository.findOne({
      where: {
        musicReleaseId: seedMediaId,
      },
    })

    if (!release) {
      throw new NotFoundException('The seed release does not exist.')
    }
  }

  /**
   * After a dynamic queue is created in the database, run it through here to
   * initialize the queue items.
   */
  async initDynamicQueue(queue: PlaybackQueue): Promise<boolean> {
    const dynamicQueue = this.dynamicQueues.get(queue.dynamicType)

    if (!dynamicQueue) {
      Logger.error(`Unknown queue.dynamicType: ${queue.dynamicType}`, 'DynamicPlayback')
      return false
    }

    try {
      const trackIds = await dynamicQueue.init(queue)

      if (!trackIds.length) {
        return false
      }

      await this.appendQueueItems(queue, trackIds)
      return true
    } catch (err) {
      Logger.error(err)
      return false
    }
  }

  /**
   * Appends the next batch of items to a dynamic queue. Each dynamic type
   * decides for itself what its next tracks are. Clients are notified over SSE
   * so that every device of the user sees the same queue.
   */
  async extendQueue(queueId: string, batchSize = REFILL_BATCH): Promise<PlaybackQueueItem[]> {
    const queue = await this.queueRepository.findOne({
      where: {
        queueId,
      },
      relations: {
        user: true,
        libraries: true,
      },
    })

    if (!queue || queue.type !== 'dynamic') {
      return []
    }

    const dynamicQueue = this.dynamicQueues.get(queue.dynamicType)

    if (!dynamicQueue) {
      Logger.error(`Unknown queue.dynamicType: ${queue.dynamicType}`, 'DynamicPlayback')
      return []
    }

    if (this.extendingQueueIds.has(queue.id)) {
      return []
    }

    this.extendingQueueIds.add(queue.id)

    try {
      const existingItems = await this.queueItemRepository.find({
        where: {
          queue: {
            id: queue.id,
          },
        },
        order: {
          position: 'asc',
        },
      })

      const nextTrackIds = await dynamicQueue.next(queue, existingItems, batchSize)

      if (!nextTrackIds.length) {
        return []
      }

      const created = await this.appendQueueItems(queue, nextTrackIds)

      this.eventService.emitToUser(queue.user?.userId, PlaybackQueueEvents.EXTENDED, {
        queueId: queue.queueId,
        addedCount: created.length,
      })

      return created
    } catch (error) {
      Logger.error(error)
      return []
    } finally {
      this.extendingQueueIds.delete(queue.id)
    }
  }

  /**
   * Inserts tracks at the end of a queue, in the given order.
   */
  private async appendQueueItems(queue: PlaybackQueue, trackIds: string[]): Promise<PlaybackQueueItem[]> {
    if (!trackIds.length) {
      return []
    }

    const lastItem = await this.queueItemRepository.findOne({
      where: {
        queue: {
          id: queue.id,
        },
      },
      order: {
        position: 'desc',
      },
    })

    let position = lastItem?.position || 0
    const items = trackIds.map((mediaId) => ({
      queue,
      mediaType: 'music_track' as const,
      mediaId,
      position: ++position,
    }))

    await this.queueItemRepository.insert(items)

    return items as PlaybackQueueItem[]
  }

  /**
   * A history entry was written for a queue item. When the item sits near the
   * end of a dynamic queue, the queue generates its next batch.
   */
  private async onQueueItemPlayed(payload: { queueItemId?: string }): Promise<void> {
    try {
      if (!payload?.queueItemId) {
        return
      }

      const playedItem = await this.queueItemRepository.findOne({
        where: {
          queueItemId: payload.queueItemId,
        },
        relations: {
          queue: true,
        },
      })

      if (!playedItem || playedItem.queue?.type !== 'dynamic') {
        return
      }

      const remaining = await this.queueItemRepository.count({
        where: {
          queue: {
            id: playedItem.queue.id,
          },
          position: MoreThan(playedItem.position),
        },
      })

      if (remaining >= REFILL_THRESHOLD) {
        return
      }

      await this.extendQueue(playedItem.queue.queueId)
    } catch (error) {
      Logger.error(error)
    }
  }
}
