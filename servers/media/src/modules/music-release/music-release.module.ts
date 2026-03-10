import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MusicReleaseController } from './music-release.controller'
import { MusicReleaseService } from './music-release.service'

import { MusicRelease } from './music-release.entity'
import { MusicReleaseMetadata } from './music-release-metadata.entity'
import { MusicReleaseThumbnail } from './music-release-thumbnail.entity'

import { EventModule } from '../event/event.module'
import { MusicArtistModule } from '../music-artist/music-artist.module'
import { LibraryModule } from '../library/library.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([MusicRelease, MusicReleaseMetadata, MusicReleaseThumbnail]),
    MusicArtistModule,
    EventModule,
    LibraryModule,
  ],
  exports: [
    TypeOrmModule,
    MusicReleaseService,
  ],
  providers: [MusicReleaseService],
  controllers: [MusicReleaseController],
})
export class MusicReleaseModule {}
