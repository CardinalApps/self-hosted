import { Injectable } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'

import { MusicHistory } from './music-history.entity'

import { MusicTrackService } from '../music-track/music-track.service'
import { EventService } from '../event/event.service'
import { User } from '../user/user.entity'
import { CreateMusicHistoryEntryDto } from './dtos/CreateMusicHistoryEntry.dto'
import { GetMusicHistoryEntriesDto } from './dtos/GetMusicHistoryEntries.dto'

@Injectable()
export class MusicHistoryService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(MusicHistory)
    private musicHistoryRepository: Repository<MusicHistory>,
    private readonly musicTrackService: MusicTrackService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Add an entry to a user's playback history.
   */
  async createPlaybackEntry(user: User, createMusicHistoryEntryDto: CreateMusicHistoryEntryDto): Promise<MusicHistory> {
    const track = await this.musicTrackService.get(createMusicHistoryEntryDto.trackId)
    const duration = track?.duration || 0

    let progress = createMusicHistoryEntryDto.seconds / duration
    if (progress > 0.991) {
      progress = 1
    }

    const entry = await this.musicHistoryRepository.save({
      progress,
      user,
      track,
    })

    return entry
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
