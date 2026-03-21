import {
  Controller,
  Body,
  Get,
  UseGuards,
  Query,
  Patch,
} from '@nestjs/common'
import {
  ApiTags,
  ApiSecurity,
} from '@nestjs/swagger'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuthGuard } from '../../guards/auth.guard'
import { ApiSecurityTypes } from '../../guards/types'
import { CurrentUser } from '../../decorators/CurrentUser.decorator'

import { MusicHistory } from './music-history.entity'

import { CreateMusicHistoryEntryDto } from './dtos/CreateMusicHistoryEntry.dto'
import { GetMusicHistoryEntriesDto } from './dtos/GetMusicHistoryEntries.dto'

import { MusicHistoryService } from './music-history.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller('music/history')
@ApiTags('Music')
export class MusicHistoryController {
  constructor(
    @InjectRepository(MusicHistory)
    private playbackEntryRepository: Repository<MusicHistory>,
    private readonly playbackHistoryService: MusicHistoryService,
  ) {}

  /**
   * Create a history entry.
   */
  @Patch()
  @StandardEndpoint({
    summary: 'Save playback history.',
    capabilities: ['MusicHistory.Create'],
  })
  async createPlaybackHistoryEntry(
    @CurrentUser() user,
    @Body() createPlaybackEntryDto: CreateMusicHistoryEntryDto,
  ): Promise<MusicHistory> {
    const entry = await this.playbackHistoryService.upsertPlaybackEntry(user, createPlaybackEntryDto)
    return entry
  }

  /**
   * Get the users playback history.
   */
  @Get()
  @StandardEndpoint({
    summary: 'Query playback history for the currently logged in user.',
    capabilities: ['MusicHistory.Read'],
  })
  @UseGuards(AuthGuard)
  @ApiSecurity(ApiSecurityTypes.LOCAL_USER_JWT)
  async queryPlaybackHistory(@Query() query: GetMusicHistoryEntriesDto): Promise<[MusicHistory[], number]> {
    return await this.playbackHistoryService.query(query)
  }
}
