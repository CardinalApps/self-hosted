import * as path from 'path'
import { Injectable, Scope } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'

import { JobTask } from '../job-task.entity'

import { ThumbnailService } from '../../thumbnail/thumbnail.service'
import { CreatedThumbnails, CreateThumbnailsOptions } from '../../thumbnail/types'
import { MusicRelease } from '../../music-release/music-release.entity'
import { MusicReleaseService } from '../../music-release/music-release.service'
import { MusicReleaseThumbnail } from '../../music-release/music-release-thumbnail.entity'

import { JobTaskStatus, JobTaskType } from '../enums'
import { JobProcessor } from '../types'

import { readEmbeddedMusicMetadata } from '../../../utils/file'

/**
 * The album_art_thumbnails job creates and manages thumbnails for album art.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AlbumArtThumbnailsJobService implements JobProcessor {
  constructor(
    @InjectRepository(JobTask)
    private jobTaskRepository: Repository<JobTask>,
    @InjectRepository(MusicRelease)
    private musicReleaseRepository: Repository<MusicRelease>,
    private readonly thumbnailService: ThumbnailService,
    private readonly musicReleaseService: MusicReleaseService,
  ) {}

  private sizes = {
    small_nocrop: [null, 160],
    medium_nocrop: [null, 640],
  }

  /**
   * A release needs work if it's missing a thumbnail for any of `this.sizes`, so
   * this counts existing thumbnails rather than checking for none at all - otherwise
   * a release that already has some (but not all) of the configured sizes would
   * never be revisited, even after `this.sizes` gains a new size.
   */
  private incompleteReleasesQuery(exclude: number[]) {
    const qb = this.musicReleaseRepository
      .createQueryBuilder('release')
      .leftJoin('release.thumbnails', 'thumbnail')
      .groupBy('release.id')
      .having('COUNT(thumbnail.id) < :expectedSizeCount', { expectedSizeCount: Object.keys(this.sizes).length })

    if (exclude.length) {
      qb.where('release.id NOT IN (:...exclude)', { exclude })
    }

    return qb
  }

  /**
   * Get all albums missing one or more artwork thumbnail sizes.
   */
  async countWork(exclude: number[]): Promise<number> {
    const remaining = await this.incompleteReleasesQuery(exclude)
      .select('release.id')
      .getMany()

    return remaining.length
  }

  /**
   * Get a batch of albums that need artwork thumbnails.
   */
  async getWork(exclude: number[], batchSize: number): Promise<number[]> {
    const batch = await this.incompleteReleasesQuery(exclude)
      .select('release.id')
      .take(batchSize)
      .getMany()

    return batch.map(({ id }) => id)
  }

  /**
   * Create thumbnails for a single album artwork.
   */
  async executeTask(task: JobTask): Promise<JobTask> {
    const musicReleaseId = Number(task.target)

    await this.jobTaskRepository.update({ id: task.id }, {
      type: JobTaskType.CREATE_ALBUM_ARTWORK_THUMBNAIL,
      status: JobTaskStatus.RUNNING,
    } as Partial<JobTask>)

    const release = await this.musicReleaseRepository.findOne({
      where: {
        id: musicReleaseId,
      },
      relations: {
        tracks: {
          file: true,
        },
        thumbnails: true,
      },
    })

    const existingSizes = new Set((release?.thumbnails ?? []).map((thumbnail) => thumbnail.size))
    const sizesToCreate = Object.fromEntries(
      Object.entries(this.sizes).filter(([size]) => !existingSizes.has(size)),
    )

    if (!Object.keys(sizesToCreate).length) {
      return await this._taskEnd(task, JobTaskStatus.COMPLETED)
    }

    /**
     * Use the first track returned from the database. Track order is undefined
     * here. Tracks may be unorganized and scattered around the file system, but
     * if they are organized then any track is safe to choose. Users with an
     * unorganized library may get inconsistent results.
     */
    const absolutePath = release?.tracks?.[0]?.file?.absolutePath
    const releasePath = absolutePath.split(path.sep).slice(1, -1).join(path.sep)
    const fileSystemArtwork = await this.musicReleaseService.getFileSystemArtwork(releasePath)
    let primaryArtwork

    if (fileSystemArtwork.length) {
      primaryArtwork = fileSystemArtwork[0]
    } else {
      const embeddedMetadata = await readEmbeddedMusicMetadata(release?.tracks?.[0]?.file?.absolutePath)
      if ('picture' in embeddedMetadata.common && Array.isArray(embeddedMetadata.common.picture) && embeddedMetadata.common.picture.length) {
        primaryArtwork = embeddedMetadata.common.picture[0]?.data
      }
    }

    if (!primaryArtwork) {
      return await this._taskEnd(task, JobTaskStatus.ERRORED, {
        results: {
          message: 'No artwork was found.',
        },
      })
    }

    let result: CreatedThumbnails

    // Create a single thumbnail
    if (typeof primaryArtwork === 'string') {
      result = await this.thumbnailService.createThumbnails({
        absoluteFilePath: primaryArtwork,
        sizes: sizesToCreate,
      } as CreateThumbnailsOptions)
    } else {
      result = await this.thumbnailService.createThumbnails({
        buffer: primaryArtwork,
        fileName: `${release.title.replace(' ', '-')}_${uuid()}.jpeg`,
        fileExtension: 'jpeg',
        sizes: sizesToCreate,
      } as CreateThumbnailsOptions)
    }

    if (result.status !== 'success' || !Object.keys(result?.files)?.length) {
      this._taskEnd(task, JobTaskStatus.ERRORED, {
        errorMessage: 'Error while creating thumbnail.',
      })
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
          release: release,
          thumbnailId: uuid(),
        } as Partial<MusicReleaseThumbnail>)
      }
    }

    await this.musicReleaseService.createReleaseThumbnails(toCreate)

    return await this._taskEnd(task, JobTaskStatus.COMPLETED)
  }

  /**
   * Write the status of the task after it's done.
   */
  async _taskEnd(task: JobTask, status: JobTaskStatus, other: Partial<JobTask> = {}): Promise<JobTask> {
    await this.jobTaskRepository.update({ id: task.id }, {
      status,
      ...other,
    })
    return await this.jobTaskRepository.findOne({ where: { id: task.id } })
  }
}
