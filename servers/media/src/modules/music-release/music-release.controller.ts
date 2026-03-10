import * as fs from 'fs'
import {
  Controller,
  Get,
  Query,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'

import { MusicRelease } from './music-release.entity'
import { MusicReleaseService } from './music-release.service'

import { GetMusicReleaseDto } from './dtos/GetMusicRelease.dto'
import { GetMusicReleasesDto } from './dtos/GetMusicReleases.dto'

import { EventService } from '../event/event.service'
import { GetMusicReleaseCover } from './dtos/GetMusicReleaseCover.dto'
import { getAppDir } from '../../utils/env'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller()
@ApiTags('Music')
export class MusicReleaseController {
  constructor(
    private readonly musicReleaseService: MusicReleaseService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Get a music release.
   */
  @Get('/music/release/:id')
  @StandardEndpoint({
    summary: 'Get a single music release.',
    capabilities: ['MusicReleases.Read'],
  })
  async getMusicArtist(
    @Param() { id }: { id: string },
    @Query() { artists, tracks, genres, thumbnails }: GetMusicReleaseDto,
  ): Promise<MusicRelease> {
    const musicRelease = await this.musicReleaseService.get(id, {
      artists,
      genres,
      ...(tracks ? { tracks: { metadata: true } } : false),
      thumbnails,
    })

    if (!musicRelease) {
      throw new NotFoundException()
    }

    return musicRelease
  }

  /**
   * Get the users music releases.
   */
  @Get('/music/releases')
  @StandardEndpoint({
    summary: 'Query music releases.',
    capabilities: ['MusicReleases.Read'],
  })
  async getMusicReleases(@Query() query: GetMusicReleasesDto): Promise<[MusicRelease[], number]> {
    return await this.musicReleaseService.query(query)
  }

  /**
   * Returns the blob data of a release cover. Supports numeric row ID and musicReleaseId col.
   */
  @Get('/music/releases/:id/cover')
  @StandardEndpoint({
    summary: 'Get the cover image of a release.',
    capabilities: ['MusicReleases.Read'],
  })
  async getReleaseCoverBlob(
    @Param('id') id: string | number,
    @Query() query: GetMusicReleaseCover,
  ): Promise<StreamableFile> {
    const release = await this.musicReleaseService.get(id, {
      thumbnails: true,
    })

    if (!release) {
      throw new NotFoundException('Release not found.')
    }

    const thumbnail = release.thumbnails?.find((thumb) => thumb.size === query.size)

    if (!thumbnail) {
      throw new NotFoundException('No thumbnail of this size found for this release.')
    }

    const thumbnailFile = getAppDir(thumbnail.relativeSrc)
    const file = fs.createReadStream(thumbnailFile)

    return new StreamableFile(file)
  }
}
