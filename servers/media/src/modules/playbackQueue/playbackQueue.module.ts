import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PlaybackQueueController } from './playbackQueue.controller'
import { QueueService } from './playbackQueue.service'

import { Queue } from './playbackQueue.entity'

import { EventModule } from '../event/event.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Queue]),
    EventModule,
  ],
  exports: [
    TypeOrmModule,
    QueueService,
  ],
  providers: [QueueService],
  controllers: [PlaybackQueueController],
})
export class PlaybackQueueModule {}
