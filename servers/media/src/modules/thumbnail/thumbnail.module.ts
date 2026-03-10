import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ThumbnailController } from './thumbnail.controller'
import { ThumbnailService } from './thumbnail.service'

import { PhotoModule } from '../photo/photo.module'
import { EventModule } from '../event/event.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    PhotoModule,
    EventModule,
  ],
  exports: [
    TypeOrmModule,
    ThumbnailService,
  ],
  providers: [
    ThumbnailService,
  ],
  controllers: [ThumbnailController],
})
export class ThumbnailModule {}
