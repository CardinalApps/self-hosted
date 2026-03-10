import * as path from 'path'
import * as fs from 'fs'
import { Injectable, Logger, Scope } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository, Brackets } from 'typeorm'
import { v4 as uuid } from 'uuid'

import { JobTask } from '../job-task.entity'

import { File } from '../../indexing/entities/file.entity'
import { Photo } from '../../photo/photo.entity'
import { PhotoVariation } from '../../photo/photo-variation.entity'

import { PhotoService } from '../../photo/photo.service'

import { JobTaskType, JobTaskStatus, OutputCacheDirectories } from '../enums'
import { JobProcessor } from '../types'

import { SupportedPhotoFileExtensions } from '../../../utils/media'
import { getAppDir, touchAppDir } from '../../../utils/env'

/**
 * The photo_variations job creates variations (copies) of some photos in a more
 * web friendly format.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class PhotoVariationsJobService implements JobProcessor {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(JobTask)
    private jobTaskRepository: Repository<JobTask>,
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
    private readonly photoService: PhotoService,
  ) {
    try {
      touchAppDir([OutputCacheDirectories.VARIATIONS])
    } catch (error) {
      Logger.error(error)
      throw new Error('Cannot access image variation cache directory')
    }
  }

  /**
   * Query units of work.
   * 
   * FIXME: merge these two queries so that photos with vaiations are filtered
   * out by the database.
   */
  async queryWork({
    count = false,
    exclude = [],
    batchSize,
  }): Promise<number | File[]> {
    // FIXME merge this query into the other one
    const allPhotoVariationsQuery = this.dataSource
      .getRepository(PhotoVariation)
      .createQueryBuilder('variation')
      .leftJoinAndSelect("variation.photo", "photo")
      .leftJoinAndSelect("photo.file", "file")
      .andWhere(
        new Brackets((qb) => {
          if (exclude.length) {
            qb.where("file.id NOT IN (:...exclude)", { exclude })
          }
        }),
      )
      .take(99999999999999)
      .skip(0)

    const heicFilesQuery = this.dataSource
      .getRepository(File)
      .createQueryBuilder('file')
      .leftJoinAndSelect("file.photo", "photo")
      .leftJoinAndSelect("photo.variations", "variations")
      //.leftJoinAndSelect(PhotoVariation, "variation", "variation.photo = file.photo.id")
      .where([
        { mimeType: 'image/heic' },
        { mimeType: 'image/heif' },
      ])
      .andWhere(
        new Brackets((qb) => {
          if (exclude.length) {
            qb.where("file.id NOT IN (:...exclude)", { exclude })
          }
        }),
      )
      .orderBy('file.createdAt', 'DESC')
      .take(batchSize)
      .skip(0)

    if (count) {
      const numVariations = await allPhotoVariationsQuery.getCount()
      const numHeicFiles = await heicFilesQuery.getCount()
      return numHeicFiles - numVariations
    } else {
      const variations = await allPhotoVariationsQuery.getMany()
      const heicFiles = await heicFilesQuery.getMany()

      const allVariationIds = variations.map((variation) => variation.id)
      const photosWithoutVariations = heicFiles.filter((file: File) => {
        const variationIds = file.photo?.variations.map((variation) => variation.id)
        const hasVariation = !variationIds.find((variationId) => {
          return allVariationIds.includes(variationId)
        })
        return hasVariation
      })

      return photosWithoutVariations
    }
  }

  /**
   * Count all photos that are candidates for variations that don't have any.
   */
  async countWork(exclude: number[]): Promise<number> {
    return await this.queryWork({
      count: true,
      exclude,
      batchSize: 1,
    }) as number
  }

  /**
   * Get a batch of photos that needs variations.
   */
  async getWork(exclude: number[], batchSize: number): Promise<number[]> {
    const batch = await this.queryWork({
      exclude,
      batchSize,
    }) as File[]

    return batch.map((file) => file.photo.id)
  }

  /**
   * Create variations of a single photo.
   */
  async executeTask(task: JobTask): Promise<JobTask> {
    const photoId = Number(task.target)

    task = await this.jobTaskRepository.save({
      id: task.id,
      type: JobTaskType.HEIC_TO_JEPG,
      status: JobTaskStatus.RUNNING,
    } as Partial<JobTask>)

    // TODO make this user configurable
    const outputFormat = SupportedPhotoFileExtensions.JPEG

    // Check if this photo already has variations
    const photo = await this.photoRepository.findOne({
      where: {
        id: photoId,
      },
      relations: {
        file: true,
        variations: true,
      },
    })

    // TODO allow the user to force recreate variations
    if (photo?.variations?.length) {
      if (photo.variations.find((variation) => variation.format === outputFormat)) {
        return await this._taskEnd(task, JobTaskStatus.COMPLETED, {
          results: {
            message: 'Skipped because variation of this format already exists.',
          },
        })
      }
    }

    // Convert image
    let converted

    try {
      converted = await this.photoService.heifToJpeg(photo.file.absolutePath) as ArrayBufferView
    } catch (error) {
      Logger.error(error, 'Photos')
      return await this._taskEnd(task, JobTaskStatus.ERRORED, {
        errorMessage: error,
      })
    }

    const inputFileName = photo.file.relativePath.split(path.sep).pop().split('.')[0]
    const outputFileName = `${photo.file.fileId}-${inputFileName}.${outputFormat}`
    const outputRelativePath = path.join(OutputCacheDirectories.VARIATIONS, outputFileName)
    const outputAbsolutePath = getAppDir(outputRelativePath)

    // Save image on disk
    try {
      fs.writeFileSync(outputAbsolutePath, converted)
    } catch (error) {
      Logger.error(error, 'Photos')
      return await this._taskEnd(task, JobTaskStatus.ERRORED, {
        errorMessage: error,
      })
    }

    // Save entity in db
    try {
      const variationEntity = {
        absolutePath: outputAbsolutePath,
        relativeSrc: outputRelativePath,
        bytes: 10,
        format: outputFormat,
        photo: photo,
        variationId: uuid(),
      } as Partial<PhotoVariation>
      await this.photoService.createPhotoVariations([variationEntity])
    } catch (error) {
      Logger.error(error, 'Photos')
      return await this._taskEnd(task, JobTaskStatus.ERRORED, {
        errorMessage: error,
      })
    }

    return await this._taskEnd(task, JobTaskStatus.COMPLETED, {
      results: {
        message: 'Variation created successfully',
      },
    })
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
