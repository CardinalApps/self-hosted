import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PhotoController } from './photo.controller'
import { PhotoService } from './photo.service'
import { Photo } from './photo.entity'
import { PhotoMetadata } from './photo-metadata.entity'
import { PhotoThumbnail } from './photo-thumbnail.entity'
import { PhotoVariation } from './photo-variation.entity'

import { File } from '../indexing/entities/file.entity'
import { EventModule } from '../event/event.module'
import { PhotoAlbumModule } from '../photo-album/photo-album.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([File, Photo, PhotoMetadata, PhotoThumbnail, PhotoVariation]),
    EventModule,
    PhotoAlbumModule,
  ],
  exports: [
    TypeOrmModule,
    PhotoService,
  ],
  providers: [PhotoService],
  controllers: [PhotoController],
})
export class PhotoModule {}
