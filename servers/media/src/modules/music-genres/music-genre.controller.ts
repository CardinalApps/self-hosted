import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'

import { MusicGenre } from './music-genre.entity'
import { MusicGenreService } from './music-genre.service'

import { GetMusicGenreDto } from './dtos/GetMusicGenre.dto'

import { EventService } from '../event/event.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller()
@ApiTags('Music')
export class MusicGenreController {
  constructor(
    private readonly musicGenreService: MusicGenreService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Get a music genre.
   */
  @Get('/music/genre/:id')
  @StandardEndpoint({
    summary: 'Get a single music genre.',
    capabilities: ['MusicGenres.Read'],
  })
  async getMusicArtist(@Param() { id }: GetMusicGenreDto): Promise<MusicGenre> {
    const musicGenre = await this.musicGenreService.get(id, {
      releases: {
        //tracks: true,
      },
    })

    if (!musicGenre) {
      throw new NotFoundException()
    }

    return musicGenre
  }
}
