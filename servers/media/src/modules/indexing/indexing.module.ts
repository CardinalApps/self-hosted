import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { IndexingController } from './indexing.controller'

import { IndexingService } from './indexing.service'
import { IndexingSeedService } from './indexing-seed.service'
import { ScannerService } from './scanner.service'
import { PhotoIndexingService } from './media/indexing.photos.service'
import { MusicIndexingService } from './media/indexing.music.service'

import { File } from './entities/file.entity'
import { Run } from './entities/run.entity'

import { EventModule } from '../event/event.module'
import { MusicTrackModule } from '../music-track/music-track.module'
import { MusicReleaseModule } from '../music-release/music-release.module'
import { MusicArtistModule } from '../music-artist/music-artist.module'
import { MusicGenreModule } from '../music-genres/music-genre.module'
import { PhotoModule } from '../photo/photo.module'
import { ThumbnailModule } from '../thumbnail/thumbnail.module'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Run, File]),
    EventModule,
    MusicTrackModule,
    MusicReleaseModule,
    MusicArtistModule,
    MusicGenreModule,
    PhotoModule,
    ThumbnailModule,
    UserModule,
  ],
  exports: [
    TypeOrmModule,
    IndexingService,
    ScannerService,
    MusicIndexingService,
    PhotoIndexingService,
  ],
  providers: [
    IndexingService,
    IndexingSeedService,
    ScannerService,
    MusicIndexingService,
    PhotoIndexingService,
  ],
  controllers: [
    IndexingController,
  ],
})
export class IndexingModule {}
