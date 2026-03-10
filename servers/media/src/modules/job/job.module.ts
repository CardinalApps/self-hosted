import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { JobController } from './job.controller'

import { JobService } from './job.service'
import { JobQueueService } from './job-queue.service'
import { JobTaskQueueService } from './job-task-queue.service'

import { AlbumArtThumbnailsJobService } from './jobs/album-art-thumbnails.service'
import { PhotoThumbnailsJobService } from './jobs/photo-thumbnails.service'
import { PhotoVariationsJobService } from './jobs/photo-variations.service'

import { Job } from './job.entity'
import { JobTask } from './job-task.entity'

import { EventModule } from '../event/event.module'
import { DatabaseModule } from '../database/database.module'
import { IndexingModule } from '../indexing/indexing.module'
import { UserModule } from '../user/user.module'
import { PhotoModule } from '../photo/photo.module'
import { ThumbnailModule } from '../thumbnail/thumbnail.module'
import { MusicReleaseModule } from '../music-release/music-release.module'

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
  ],
  exports: [
    TypeOrmModule,
    JobService,
    JobQueueService,
    JobTaskQueueService,
    AlbumArtThumbnailsJobService,
    PhotoVariationsJobService,
    PhotoThumbnailsJobService,
  ],
  providers: [
    JobService,
    JobQueueService,
    JobTaskQueueService,
    AlbumArtThumbnailsJobService,
    PhotoVariationsJobService,
    PhotoThumbnailsJobService,
  ],
  controllers: [
    JobController,
  ],
})
export class JobModule {}
