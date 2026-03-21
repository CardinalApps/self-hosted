import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'

import { PlaybackQueue } from './playback-queue.entity'

import { EventService } from '../event/event.service'

import { LibraryService } from '../library/library.service'
import { MusicTrack } from '../music-track/music-track.entity'
import { PlaybackQueueItem } from './playback-queue-item.entity'

/**
 * The StaticPlayback class manages static queues.
 */
@Injectable()
export class StaticPlayback {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,

    @InjectRepository(PlaybackQueue)
    private queueRepository: Repository<PlaybackQueue>,

    @InjectRepository(PlaybackQueueItem)
    private queueItemRepository: Repository<PlaybackQueueItem>,

    @InjectRepository(MusicTrack)
    private musicTrackRepository: Repository<MusicTrack>,

    private readonly eventService: EventService,
    private readonly libraryService: LibraryService,
  ) {}

  /**
   * After a static queue is created in the database, run it through here to
   * initialize the queue items.
   */
  async initStaticQueue(queue: PlaybackQueue, staticQueueItems: Partial<PlaybackQueueItem>[]): Promise<boolean> {
    const entriesToCreate = []

    for (const position in staticQueueItems) {
      const item = staticQueueItems[position]
      if (item.mediaType) {
        const entry = await this.queueItemRepository.create({
          queue,
          mediaType: item.mediaType,
          mediaId: item.mediaId,
          position: Number(position),
        })
        entriesToCreate.push(entry)
      } else {
        Logger.warn('Missing queue item media_type', 'Playback')
      }
    }

    if (!entriesToCreate.length) {
      Logger.warn('No static queue entities created', 'Playback')
    }

    try {
      await this.queueItemRepository.insert(entriesToCreate)
      return true
    } catch (err) {
      Logger.error(err)
      return false
    }
  }
}
