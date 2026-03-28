import * as fs from 'fs'
import {
  Controller,
  Get,
  Query,
  NotFoundException,
  Param,
  Res,
  Req,
  StreamableFile,
  ServiceUnavailableException,
} from '@nestjs/common'
import {
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'

import { MusicTrack } from './music-track.entity'
import { MusicTrackService } from './music-track.service'

import { GetMusicTrackDto } from './dtos/GetMusicTrack.dto'
import { StreamMusicTrackDto } from './dtos/StreamMusicTrack.dto'
import { GetMusicTracksDto } from './dtos/GetMusicTracks.dto'

import { EventService } from '../event/event.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller()
@ApiTags('Music')
export class MusicTrackController {
  constructor(
    private readonly musicTrackService: MusicTrackService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Get a music track.
   */
  @Get('/music/track/:id')
  @StandardEndpoint({
    summary: 'Get a single music track.',
    capabilities: ['MusicTracks.Read'],
  })
  async getMusicTrack(@Param() { id }: GetMusicTrackDto): Promise<MusicTrack> {
    const musicTrack = await this.musicTrackService.get(id, { artists: true, release: { thumbnails: true } })

    if (!musicTrack) {
      throw new NotFoundException()
    }

    return musicTrack
  }

  /**
   * Get the users tracks.
   */
  @Get('/music/tracks')
  @StandardEndpoint({
    summary: 'Query music tracks.',
    capabilities: ['MusicTracks.Read'],
  })
  async getTracks(@Query() query: GetMusicTracksDto): Promise<[MusicTrack[], number]> {
    return await this.musicTrackService.query(query)
  }

  /**
   * Stream a music track.
   */
  @Get('/music/stream/:id')
  @StandardEndpoint({
    summary: 'Stream a music track.',
    description: 'Stream a music track directly to your browser without any transcoding.',
    capabilities: ['MusicTracks.Play'],
  })
  async streamMusicTrack(
    @Param() { id }: StreamMusicTrackDto,
    @Req() req: Response,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const musicTrack = await this.musicTrackService.get(id, { file: true })

    if (!musicTrack) {
      throw new NotFoundException()
    }

    const fileStats = fs.statSync(musicTrack.file.absolutePath)

    if (!fileStats) {
      throw new ServiceUnavailableException('Could not read file stats.')
    }

    const range = req.header('range') as unknown as string

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const partialStart = parts[0]
      const partialEnd = parts[1]

      const start = parseInt(partialStart, 10)
      const end = partialEnd ? parseInt(partialEnd, 10) : fileStats.size - 1
      const chunkSize = (end - start) + 1

      const readStream = fs.createReadStream(musicTrack.file.absolutePath, { start, end })

      res.status(206)
      res.set({
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${fileStats.size}`,
        'Content-Length': chunkSize,
      })

      return new StreamableFile(readStream)
    } else {
      const readStream = fs.createReadStream(musicTrack.file.absolutePath)

      res.status(200)
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': fileStats.size,
      })

      return new StreamableFile(readStream)
    }
  }
}
