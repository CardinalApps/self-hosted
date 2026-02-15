import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PlaybackQueueController } from './playbackQueue.controller'
import { QueueService } from './playbackQueue.service'

import { PlaybackQueue } from './playbackQueue.entity'

import { EventModule } from '../event/event.module'
import { LibraryModule } from '../library/library.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([PlaybackQueue]),
    EventModule,
    LibraryModule,
  ],
  exports: [
    TypeOrmModule,
    QueueService,
  ],
  providers: [QueueService],
  controllers: [PlaybackQueueController],
})
export class PlaybackQueueModule {}
