import { Injectable, Scope } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull, Not, In } from 'typeorm'
import { v4 as uuid } from 'uuid'

import { JobTask } from '../job-task.entity'
import { Photo } from '../../photo/photo.entity'

import { ThumbnailService } from '../../thumbnail/thumbnail.service'
import { PhotoService } from '../../photo/photo.service'

import { CreateThumbnailsOptions } from '../../thumbnail/types'
import { JobProcessor } from '../types'
import { JobTaskType, JobTaskStatus } from '../enums'

import { SupportedPhotoFileExtensions } from '../../../utils/media'

/**
 * The photo_thumbnails job creates and manages thumbnails for all photos in the
 * user's Photos library.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class PhotoThumbnailsJobService implements JobProcessor {
  constructor(
    @InjectRepository(JobTask)
    private jobTaskRepository: Repository<JobTask>,
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
    private readonly thumbnailService: ThumbnailService,
    private readonly photoService: PhotoService,
  ) {}

  private sizes = {
    small_nocrop: [null, 160],
    medium_nocrop: [null, 500],
  }

  /**
   * Count all photos that don't have any thumbnails.
   */
  async countWork(exclude: number[]): Promise<number> {
    const remaining = await this.photoRepository.count({
      where: {
        id: Not(In(exclude)),
        thumbnail: {
          id: IsNull(),
        },
      },
    })

    return remaining
  }

  /**
   * Get a batch of photos that don't have thumbnails.
   */
  async getWork(exclude: number[], batchSize: number): Promise<number[]> {
    const batch = await this.photoRepository.find({
      select: {
        id: true,
      },
      where: {
        id: Not(In(exclude)),
        thumbnail: {
          id: IsNull(),
        },
      },
      take: batchSize,
    })

    return batch.map(({ id }) => id)
  }

  /**
   * Create all of the thumbnails for a single photo.
   */
  async executeTask(task: JobTask): Promise<JobTask> {
    const photoId = Number(task.target)

    await this.jobTaskRepository.update({ id: task.id }, {
      type: JobTaskType.CREATE_PHOTO_THUMBNAIL,
      status: JobTaskStatus.RUNNING,
    } as Partial<JobTask>)

    const photo = await this.photoRepository.findOne({
      where: {
        id: photoId,
      },
      relations: {
        thumbnail: true,
        variations: true,
        file: true,
      },
    })

    // Use the jpeg variation if one exists to avoid converting the source
    // format to jpeg
    const jpegVariation = photo?.variations?.find?.((variation) => variation.format === SupportedPhotoFileExtensions.JPEG)
    const absoluteFilePath = jpegVariation
      ? photo.variations[0].absolutePath
      : photo.file.absolutePath

    // Create thumbnails
    const result = await this.thumbnailService.createThumbnails({
      absoluteFilePath: absoluteFilePath,
      sizes: this.sizes,
    } as CreateThumbnailsOptions)

    if (result.status !== 'success' || !Object.keys(result?.files)?.length) {
      return await this._taskEnd(task, JobTaskStatus.ERRORED, { errorMessage: 'Error while creating thumbnail.' })
    }

    const toCreate = []

    for (const [size, thumb] of Object.entries(result.files)) {
      if (thumb && thumb?.absoluteFilePath) {
        toCreate.push({
          absolutePath: thumb?.absoluteFilePath,
          relativeSrc: thumb?.relativeSrc,
          size: size,
          bytes: thumb?.size,
          format: thumb?.format,
          width: thumb?.width,
          height: thumb?.height,
          photo: photo,
          thumbnailId: uuid(),
        })
      }
    }

    await this.photoService.createPhotoThumbnails(toCreate)

    return await this._taskEnd(task, JobTaskStatus.COMPLETED)
  }

  /**
   * Write the status of the task after it's done.
   */
  async _taskEnd(task: JobTask, status: JobTaskStatus, other: Partial<JobTask> = {}): Promise<JobTask> {
    return await this.jobTaskRepository.save({
      id: task.id,
      status: status,
      completedAt: new Date(),
      ...other,
    })
  }
}
