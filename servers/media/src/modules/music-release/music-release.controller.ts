import * as fs from 'fs'
import {
  Controller,
  Get,
  Header,
  Query,
  NotFoundException,
  Param,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'
import { Request, Response } from 'express'

import { MusicRelease } from './music-release.entity'
import { MusicReleaseService } from './music-release.service'

import { GetMusicReleaseDto } from './dtos/GetMusicRelease.dto'
import { GetMusicReleasesDto } from './dtos/GetMusicReleases.dto'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'
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
    @CurrentUser() user,
    @Param() { id }: { id: string },
    @Query() { artists, tracks, genres, thumbnails }: GetMusicReleaseDto,
  ): Promise<MusicRelease> {
    const musicRelease = await this.musicReleaseService.get(id, {
      artists,
      genres,
      ...(tracks ? { tracks: { metadata: true, artists: true } } : false),
      thumbnails,
    }, user)

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
  @Header('Cache-Control', 'private, no-cache')
  @StandardEndpoint({
    summary: 'Get the cover image of a release.',
    capabilities: ['MusicReleases.Read'],
  })
  async getReleaseCoverBlob(
    @Param('id') id: string | number,
    @Query() query: GetMusicReleaseCover,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | undefined> {
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

    // thumbnailId is a fresh uuid every time this size is (re)created, so it doubles as a
    // content fingerprint - the client re-sends it as If-None-Match on the next request, and
    // an unchanged thumbnail short-circuits into a 304 instead of a full re-download.
    const etag = `"${thumbnail.thumbnailId}"`

    res.set('ETag', etag)
    res.set('Last-Modified', new Date(thumbnail.updatedAt).toUTCString())

    if (req.headers['if-none-match'] === etag) {
      res.status(304)
      return undefined
    }

    const thumbnailFile = getAppDir(thumbnail.relativeSrc)
    const file = fs.createReadStream(thumbnailFile)

    const format = (thumbnail.format || 'jpeg').toLowerCase()
    const mimeType = format === 'png' ? 'image/png' : format === 'gif' ? 'image/gif' : 'image/jpeg'

    return new StreamableFile(file, { type: mimeType })
  }
}
