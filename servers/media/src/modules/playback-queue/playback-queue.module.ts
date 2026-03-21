import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PlaybackQueueController } from './playback-queue.controller'
import { QueueService } from './playback-queue.service'

import { PlaybackQueue } from './playback-queue.entity'

import { EventModule } from '../event/event.module'
import { LibraryModule } from '../library/library.module'
import { StaticPlayback } from './static-playback-queue.service'
import { DynamicPlayback } from './dynamic-playback-queue.service'
import { PlaybackQueueItem } from './playback-queue-item.entity'
import { MusicTrackModule } from '../music-track/music-track.module'
import { QueueItemService } from './playback-queue-item.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([PlaybackQueue, PlaybackQueueItem]),
    EventModule,
    LibraryModule,
    MusicTrackModule,
  ],
  exports: [
    TypeOrmModule,
    QueueService,
    QueueItemService,
    StaticPlayback,
    DynamicPlayback,
  ],
  providers: [QueueService, QueueItemService, StaticPlayback, DynamicPlayback],
  controllers: [PlaybackQueueController],
})
export class PlaybackQueueModule {}
