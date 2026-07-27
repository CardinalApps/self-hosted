import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PlaybackQueueController } from './playback-queue.controller'
import { QueueService } from './playback-queue.service'

import { PlaybackQueue } from './playback-queue.entity'

import { EventModule } from '../event/event.module'
import { LibraryModule } from '../library/library.module'
import { StaticPlayback } from './static-playback-queue.service'
import { DynamicPlayback } from './dynamic-playback-queue.service'
import { TrackSelection } from './dynamic-queues/track-selection.service'
import { DYNAMIC_QUEUE_SERVICES, dynamicQueueRegistryProvider } from './dynamic-queues/dynamic-queue.registry'
import { PlaybackQueueItem } from './playback-queue-item.entity'
import { MusicTrackModule } from '../music-track/music-track.module'
import { QueueItemService } from './playback-queue-item.service'
import { MusicRelease } from '../music-release/music-release.entity'
import { MusicArtist } from '../music-artist/music-artist.entity'
import { Rating } from '../rating/rating.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([PlaybackQueue, PlaybackQueueItem, MusicRelease, MusicArtist, Rating]),
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
  providers: [
    QueueService,
    QueueItemService,
    StaticPlayback,
    DynamicPlayback,
    TrackSelection,
    ...DYNAMIC_QUEUE_SERVICES,
    dynamicQueueRegistryProvider,
  ],
  controllers: [PlaybackQueueController],
})
export class PlaybackQueueModule {}
