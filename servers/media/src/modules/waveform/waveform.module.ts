import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { WaveformController } from './waveform.controller'
import { WaveformService } from './waveform.service'

import { MusicTrack } from '../music-track/music-track.entity'
import { MusicTrackWaveform } from '../music-track/music-track-waveform.entity'

import { EventModule } from '../event/event.module'
import { MusicTrackModule } from '../music-track/music-track.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([MusicTrack, MusicTrackWaveform]),
    EventModule,
    MusicTrackModule,
  ],
  exports: [
    TypeOrmModule,
    WaveformService,
  ],
  providers: [WaveformService],
  controllers: [WaveformController],
})
export class WaveformModule {}
