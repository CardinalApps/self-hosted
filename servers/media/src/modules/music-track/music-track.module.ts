import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MusicTrackController } from './music-track.controller'
import { MusicTrackService } from './music-track.service'

import { MusicTrack } from './music-track.entity'
import { MusicTrackMetadata } from './music-track-metadata.entity'

import { EventModule } from '../event/event.module'
import { LibraryModule } from '../library/library.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([MusicTrack, MusicTrackMetadata]),
    EventModule,
    LibraryModule,
  ],
  exports: [
    TypeOrmModule,
    MusicTrackService,
  ],
  providers: [MusicTrackService],
  controllers: [MusicTrackController],
})
export class MusicTrackModule {}
