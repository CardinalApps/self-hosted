import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'

import { PlaybackQueue } from './playback-queue.entity'

import { EventService } from '../event/event.service'

import { LibraryService } from '../library/library.service'
import { MusicTrack } from '../music-track/music-track.entity'
import { PlaybackQueueItem } from './playback-queue-item.entity'

/**
 * The DynamicPlayback class generates the queue items in all Queues whose type
 * is `dynamic`.
 */
@Injectable()
export class DynamicPlayback {
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
   * After a dynamic queue is created in the database, run it through here to
   * initialize the queue items.
   */
  async initDynamicQueue(queue: PlaybackQueue): Promise<boolean> {
    switch (queue.dynamicType) {
      case 'true_shuffle':
        return await this.initTrueShuffleQueue(queue)
      default:
        Logger.error('Missing queue.dynamicType', 'DynamicPlayback')
        return false
    }
  }

  /**
   * Initialize a True Shuffle queue.
   * 
   * True Shuffle creates a queue with 200 random songs from the given
   * libraries. Randomization is applied by the database.
   */
  private async initTrueShuffleQueue(queue: PlaybackQueue): Promise<boolean> {
    const initialBatchSize = 200

    const randomTracksQuery = this.musicTrackRepository
      .createQueryBuilder('music_track')
      .select(['music_track.musicTrackId'])
      .orderBy('RANDOM()')
      .limit(initialBatchSize)

    if (queue?.libraries?.length) {
      randomTracksQuery.innerJoin(
        'music_track.file',
        ...this.libraryService.createJoinArgs(queue.libraries),
      )
    }

    const randomTracks = await randomTracksQuery.getMany()
    const queueItems: Partial<PlaybackQueueItem>[] = randomTracks.map((track, index) => (
      {
        queue,
        mediaType: 'music_track',
        mediaId: track.musicTrackId,
        position: index + 1,
      }
    ))

    try {
      await this.queueItemRepository.insert(queueItems)
      return true
    } catch (err) {
      Logger.error(err)
      return false
    }
  }
}
