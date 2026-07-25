import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MusicArtistController } from './music-artist.controller'
import { MusicArtistService } from './music-artist.service'
import { MusicArtistSummaryService } from './music-artist-summary.service'

import { MusicArtist } from './music-artist.entity'
import { MusicArtistMetadata } from './music-artist-metadata.entity'
import { MusicTrack } from '../music-track/music-track.entity'
import { MusicTrackMetadata } from '../music-track/music-track-metadata.entity'
import { MusicTrackWaveform } from '../music-track/music-track-waveform.entity'
import { MusicRelease } from '../music-release/music-release.entity'
import { MusicHistory } from '../music-history/music-history.entity'
import { Rating } from '../rating/rating.entity'

import { EventModule } from '../event/event.module'
import { LibraryModule } from '../library/library.module'
import { MusicTrackModule } from '../music-track/music-track.module'
import { RatingModule } from '../rating/rating.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MusicArtist,
      MusicArtistMetadata,
      MusicTrack,
      MusicTrackMetadata,
      MusicTrackWaveform,
      MusicRelease,
      MusicHistory,
      Rating,
    ]),
    EventModule,
    LibraryModule,
    MusicTrackModule,
    RatingModule,
  ],
  exports: [
    TypeOrmModule,
    MusicArtistService,
    MusicArtistSummaryService,
  ],
  providers: [MusicArtistService, MusicArtistSummaryService],
  controllers: [MusicArtistController],
})
export class MusicArtistModule {}
