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
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'

import { CurrentUser } from '../../decorators/CurrentUser.decorator'
import { MusicTrackComputed } from './music-track.entity'
import { MusicTrackService } from './music-track.service'

import { GetMusicTrackDto } from './dtos/GetMusicTrack.dto'
import { StreamMusicTrackDto } from './dtos/StreamMusicTrack.dto'
import { StreamMusicTrackQueryDto } from './dtos/StreamMusicTrackQuery.dto'
import { GetMusicTracksDto } from './dtos/GetMusicTracks.dto'

import { TranscodingService } from '../transcoding/transcoding.service'
import { EventService } from '../event/event.service'
import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'
import { ApiSecurityTypes } from '../../guards/types'

@Controller()
@ApiTags('Music')
export class MusicTrackController {
  constructor(
    private readonly musicTrackService: MusicTrackService,
    private readonly transcodingService: TranscodingService,
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
  async getMusicTrack(@CurrentUser() user, @Param() { id }: GetMusicTrackDto): Promise<MusicTrackComputed> {
    const musicTrack = await this.musicTrackService.get(id, { artists: true, release: { thumbnails: true } }, user)

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
  async getTracks(@CurrentUser() user, @Query() query: GetMusicTracksDto): Promise<[MusicTrackComputed[], number]> {
    return await this.musicTrackService.query(query, user)
  }

  /**
   * Stream a music track.
   */
  @Get('/music/stream/:id')
  @StandardEndpoint({
    summary: 'Stream a music track.',
    description: 'Stream a music track using either direct stream or transcoding.',
    capabilities: ['MusicTracks.Play'],
  })
  @ApiSecurity(ApiSecurityTypes.LOCAL_USER_JWT_QUERY)
  async streamMusicTrack(
    @Param() { id }: StreamMusicTrackDto,
    @Query() query: StreamMusicTrackQueryDto,
    @Req() req: Response,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const musicTrack = await this.musicTrackService.get(id, { file: true })

    if (!musicTrack) {
      throw new NotFoundException()
    }

    // On-the-fly transcoding — skip if the source is already MP3
    if (query.transcode && musicTrack.file.extension !== 'mp3') {
      // CBR MP3 byte-time mapping. Used to estimate total size and to translate
      // Range requests in bytes into FFmpeg seek positions in seconds.
      const bytesPerSecond = query.bitrate * 1000 / 8
      const totalBytes = musicTrack.duration
        ? Math.ceil(musicTrack.duration * bytesPerSecond)
        : 0

      const range = req.header('range') as unknown as string

      let start = 0
      let end = totalBytes ? totalBytes - 1 : 0

      if (range && totalBytes) {
        const parts = range.replace(/bytes=/, '').split('-')
        start = parseInt(parts[0], 10) || 0
        end = parts[1] ? parseInt(parts[1], 10) : totalBytes - 1
      }

      const startSeconds = start / bytesPerSecond
      const stream = this.transcodingService.transcodeAudioToMp3(
        musicTrack.file.absolutePath,
        query.bitrate,
        startSeconds,
      )

      if (range && totalBytes) {
        res.status(206)
        res.set({
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${totalBytes}`,
          'Content-Length': end - start + 1,
        })
      } else {
        const headers: Record<string, string | number> = {
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': totalBytes ? 'bytes' : 'none',
        }
        if (totalBytes) {
          headers['Content-Length'] = totalBytes
        }
        res.set(headers)
      }

      return new StreamableFile(stream)
    }

    const fileStats = fs.statSync(musicTrack.file.absolutePath)

    if (!fileStats) {
      throw new ServiceUnavailableException('Could not read file stats.')
    }

    // Direct stream
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
