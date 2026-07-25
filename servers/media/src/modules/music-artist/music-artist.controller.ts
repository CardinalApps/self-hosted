import {
  Controller,
  Get,
  Query,
  NotFoundException,
  Param,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'

import { MusicArtist } from './music-artist.entity'
import { MusicArtistService } from './music-artist.service'
import { MusicArtistSummaryService } from './music-artist-summary.service'

import { GetMusicArtistDto } from './dtos/GetMusicArtist.dto'
import { GetMusicArtistQueryDto } from './dtos/GetMusicArtistQuery.dto'
import { GetMusicArtistsDto } from './dtos/GetMusicArtists.dto'
import { MusicArtistSummary } from './types'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'
import { EventService } from '../event/event.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

type MusicArtistWithSummary = MusicArtist & { summary?: MusicArtistSummary }

@Controller()
@ApiTags('Music')
export class MusicArtistController {
  constructor(
    private readonly musicArtistService: MusicArtistService,
    private readonly musicArtistSummaryService: MusicArtistSummaryService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Get a music artist.
   */
  @Get('/music/artist/:id')
  @StandardEndpoint({
    summary: 'Get a single music artist.',
    capabilities: ['MusicArtists.Read'],
  })
  async getMusicArtist(
    @CurrentUser() user,
    @Param() { id }: GetMusicArtistDto,
    @Query() { releases, tracks, metadata, summary, playCount, rating }: GetMusicArtistQueryDto,
  ): Promise<MusicArtistWithSummary> {
    const musicArtist: MusicArtistWithSummary = await this.musicArtistService.get(id, {
      ...(releases ? { releases: { tracks: true, thumbnails: true } } : {}),
      ...(tracks ? { tracks: true } : {}),
      ...(metadata ? { metadata: true } : {}),
    }, { user, playCount, rating })

    if (!musicArtist) {
      throw new NotFoundException()
    }

    if (summary) {
      musicArtist.summary = await this.musicArtistSummaryService.getSummary(musicArtist, user)
    }

    return musicArtist
  }

  /**
   * Get the users music artists.
   */
  @Get('/music/artists')
  @StandardEndpoint({
    summary: 'Query music artists.',
    capabilities: ['MusicArtists.Read'],
  })
  async getMusicArtists(@Query() query: GetMusicArtistsDto): Promise<[MusicArtist[], number]> {
    return await this.musicArtistService.query(query)
  }
}
