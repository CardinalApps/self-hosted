import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { JobController } from './job.controller'

import { JobService } from './job.service'
import { JobQueueService } from './job-queue.service'
import { JobTaskQueueService } from './job-task-queue.service'

import { AlbumArtThumbnailsJobService } from './jobs/album-art-thumbnails.service'
import { PhotoThumbnailsJobService } from './jobs/photo-thumbnails.service'
import { PhotoVariationsJobService } from './jobs/photo-variations.service'
import { GenerateWaveformJobService } from './jobs/generate-waveform.service'

import { Job } from './job.entity'
import { JobTask } from './job-task.entity'

import { EventModule } from '../event/event.module'
import { DatabaseModule } from '../database/database.module'
import { IndexingModule } from '../indexing/indexing.module'
import { UserModule } from '../user/user.module'
import { PhotoModule } from '../photo/photo.module'
import { ThumbnailModule } from '../thumbnail/thumbnail.module'
import { MusicReleaseModule } from '../music-release/music-release.module'
import { MusicTrackModule } from '../music-track/music-track.module'
import { WaveformModule } from '../waveform/waveform.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobTask]),
    EventModule,
    IndexingModule,
    UserModule,
    PhotoModule,
    ThumbnailModule,
    DatabaseModule,
    MusicReleaseModule,
    MusicTrackModule,
    WaveformModule,
  ],
  exports: [
    TypeOrmModule,
    JobService,
    JobQueueService,
    JobTaskQueueService,
    AlbumArtThumbnailsJobService,
    PhotoVariationsJobService,
    PhotoThumbnailsJobService,
    GenerateWaveformJobService,
  ],
  providers: [
    JobService,
    JobQueueService,
    JobTaskQueueService,
    AlbumArtThumbnailsJobService,
    PhotoVariationsJobService,
    PhotoThumbnailsJobService,
    GenerateWaveformJobService,
  ],
  controllers: [
    JobController,
  ],
})
export class JobModule {}
