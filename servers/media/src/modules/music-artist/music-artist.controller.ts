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

import { GetMusicArtistDto } from './dtos/GetMusicArtist.dto'
import { GetMusicArtistsDto } from './dtos/GetMusicArtists.dto'

import { EventService } from '../event/event.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller()
@ApiTags('Music')
export class MusicArtistController {
  constructor(
    private readonly musicArtistService: MusicArtistService,
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
  async getMusicArtist(@Param() { id }: GetMusicArtistDto): Promise<MusicArtist> {
    const musicArtist = await this.musicArtistService.get(id, {
      releases: true,
      tracks: true,
    })

    if (!musicArtist) {
      throw new NotFoundException()
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
