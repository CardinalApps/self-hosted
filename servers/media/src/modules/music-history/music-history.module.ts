import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MusicHistoryController } from './music-history.controller'
import { MusicHistoryService } from './music-history.service'
import { MusicHistory } from './music-history.entity'

import { EventModule } from '../event/event.module'
import { UserModule } from '../user/user.module'
import { MusicTrackModule } from '../music-track/music-track.module'
import { PlaybackQueueItem } from '../playback-queue/playback-queue-item.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([MusicHistory, PlaybackQueueItem]),
    UserModule,
    EventModule,
    MusicTrackModule,
  ],
  exports: [TypeOrmModule, MusicHistoryService],
  providers: [MusicHistoryService],
  controllers: [MusicHistoryController],
})
export class MusicHistoryModule {}
