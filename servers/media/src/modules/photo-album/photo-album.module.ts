import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PhotoAlbumController } from './photo-album.controller'
import { PhotoAlbumService } from './photo-album.service'
import { PhotoAlbum } from './photo-album.entity'
import { PhotoAlbumEntry } from './photo-album-entry.entity'
import { PhotoAlbumEntryService } from './photo-album-entry.service'
import { PhotoAlbumMetadata } from './photo-album-metadata.entity'

import { EventModule } from '../event/event.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([PhotoAlbum, PhotoAlbumEntry, PhotoAlbumMetadata]),
    EventModule,
  ],
  exports: [
    TypeOrmModule,
    PhotoAlbumService,
    PhotoAlbumEntryService,
  ],
  providers: [PhotoAlbumService, PhotoAlbumEntryService],
  controllers: [PhotoAlbumController],
})
export class PhotoAlbumModule {}
