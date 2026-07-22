import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'

import { MusicTrackWaveform } from '../music-track/music-track-waveform.entity'
import { MusicTrackService } from '../music-track/music-track.service'
import { WaveformService } from './waveform.service'
import { WAVEFORM_VERSION } from './analysis'

import { GetMusicTrackWaveformDto } from './dtos/GetMusicTrackWaveform.dto'

import { StandardEndpoint } from '../../decorators/StandardEndpoint.decorator'

@Controller()
@ApiTags('Music')
export class WaveformController {
  constructor(
    private readonly musicTrackService: MusicTrackService,
    private readonly waveformService: WaveformService,
  ) {}

  /**
   * Get the waveform of a music track.
   */
  @Get('/music/track/:id/waveform')
  @StandardEndpoint({
    summary: 'Get the waveform of a music track.',
    description: 'Returns the stored waveform data for a track. When no current waveform exists yet, responds '
      + 'with 202 and begins generating one; a `music.waveform_ready` server-sent event announces the result.',
    capabilities: ['MusicTracks.Read'],
  })
  async getMusicTrackWaveform(
    @Param() { id }: GetMusicTrackWaveformDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MusicTrackWaveform | undefined> {
    const track = await this.musicTrackService.get(id)

    if (!track) {
      throw new NotFoundException()
    }

    const waveform = await this.waveformService.getForTrack(track.id)

    if (waveform && waveform.version === WAVEFORM_VERSION) {
      return waveform
    }

    res.status(202)

    this.waveformService.generateOnDemand(track.id).catch((error) => {
      Logger.error(`On-demand waveform generation failed for track ${track.id}: ${error.message}`, 'Waveform')
    })
  }
}
