import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'

import { TranscodingService } from './transcoding.service'
import { TranscodeMusicTrackDto } from './dtos/TranscodeMusicTrack.dto'

import { MusicTrackService } from '../music-track/music-track.service'

import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller()
@ApiTags('Transcoding')
export class TranscodingController {
  constructor(
    private readonly transcodingService: TranscodingService,
    private readonly musicTrackService: MusicTrackService,
  ) {}

  @Get('/transcode/music/:id')
  @StandardEndpoint({
    summary: 'Transcode and stream a music track.',
    description: 'Your music file will be transcoded to MP3 @ 320kbps.',
    capabilities: ['MusicTracks.Play'],
  })
  async transcodeMusicTrack(
    @Param() { id }: TranscodeMusicTrackDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const musicTrack = await this.musicTrackService.get(id, { file: true })

    if (!musicTrack) {
      throw new NotFoundException()
    }

    const stream = this.transcodingService.transcodeAudioToMp3(musicTrack.file.absolutePath)

    res.set({
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'none',
    })

    return new StreamableFile(stream)
  }
}
