import { Injectable } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'

import { MusicHistory } from './music-history.entity'

import { MusicTrackService } from '../music-track/music-track.service'
import { EventService } from '../event/event.service'
import { User } from '../user/user.entity'
import { CreateMusicHistoryEntryDto } from './dtos/CreateMusicHistoryEntry.dto'
import { GetMusicHistoryEntriesDto } from './dtos/GetMusicHistoryEntries.dto'
import { PlaybackQueueItem } from '../playback-queue/playback-queue-item.entity'

@Injectable()
export class MusicHistoryService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,

    @InjectRepository(MusicHistory)
    private musicHistoryRepository: Repository<MusicHistory>,

    @InjectRepository(PlaybackQueueItem)
    private playbackQueueItemRepository: Repository<PlaybackQueueItem>,

    private readonly musicTrackService: MusicTrackService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Add an entry to a user's playback history.
   */
  async upsertPlaybackEntry(user: User, createMusicHistoryEntryDto: CreateMusicHistoryEntryDto): Promise<MusicHistory> {
    const queueItem = await this.playbackQueueItemRepository.findOne({
      where: {
        queueItemId: createMusicHistoryEntryDto.queueItemId,
      },
    })

    const historyEntry = await this.musicHistoryRepository.findOne({
      where: {
        queueItem: {
          queueItemId: createMusicHistoryEntryDto.queueItemId,
        },
      },
    })

    const track = await this.musicTrackService.get(createMusicHistoryEntryDto.trackId)
    const progress = track?.duration
      ? createMusicHistoryEntryDto.seconds / track.duration
      : 0

    const rounded = progress > 0.991
      ? 1
      : progress

    const saved = await this.musicHistoryRepository.save({
      ...(historyEntry ? { id: historyEntry.id } : {}),
      queueItem,
      progress: rounded,
      user,
      track,
    })

    return saved
  }

  /**
   * Returns all tracks according to the query.
   */
  async query(getPlaybackEntriesDto: GetMusicHistoryEntriesDto): Promise<[MusicHistory[], number]> {
    const { take, skip, order, sort } = getPlaybackEntriesDto
    return await this.musicHistoryRepository.findAndCount({
      take,
      skip,
      order: {
        [sort]: order,
      },
      relations: {
        track: {
          release: true,
          artists: true,
        },
        user: true,
      },
    })
  }
}
