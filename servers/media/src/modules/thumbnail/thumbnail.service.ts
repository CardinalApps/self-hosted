import * as path from 'path'
import * as worker_threads from 'worker_threads'
import { Injectable, Logger } from '@nestjs/common'
import { v4 as uuid } from 'uuid'
import * as fsExtra from 'fs-extra'

import { PhotoService } from '../photo/photo.service'

import { OutputCacheDirectories } from './enums'
import {
  CreatedThumbnail,
  CreatedThumbnails,
  CreateThumbnailsOptions,
  CreateThumbnailWorkerInput,
} from './types'

import { touchAppDir, getAppDir } from '../../utils/env'
import { SupportedPhotoFileExtensions, AllSupportedFileExtensions, canonicalExtension, SupportedCinemaFileExtensions, SupportedMusicFileExtensions } from '../../utils/media'
import { log, LogModule, LogLevel } from '../../utils/logging'

@Injectable()
export class ThumbnailService {
  constructor(
    private readonly photoService: PhotoService,
  ) {
    try {
      touchAppDir([OutputCacheDirectories.PHOTO_THUMBNAILS])
    } catch (error) {
      Logger.error(error)
      throw new Error('Cannot access image thumbnail cache directory')
    }
  }

  /**
   * Generic thumbnail file creation method. This can be used to create
   * thumbnails of photos, album art, posters, or any other kind of raster
   * image.
   * 
   * The input image can be any of the file formats supported by the home
   * server, but the output image will always be .jpeg with optimizations for
   * thumbnails. All output files will be saved in the same directory with a
   * random part in their filename for uniqueness.
   * 
   * This only creates the thumbnail files in the file system. It does not
   * create any database entities.
   */
  createThumbnails(options: CreateThumbnailsOptions): Promise<CreatedThumbnails> {
    // FIXME
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (allThumbnailsResolve) => {
      const sourceFileName = options?.absoluteFilePath
        ? options.absoluteFilePath.split(path.sep).pop()
        : options.fileName
      const sourceFileExtension = sourceFileName
        ? sourceFileName.split('.').pop()
        : options.fileExtension
      const sourceFileExtensionLowercase = sourceFileExtension.toLowerCase()
      const sourceFileNameWithoutExtension = sourceFileName.replace(`.${sourceFileExtension}`, '')
      const groupUuid = uuid()
      const createdThumbnails: CreatedThumbnails = {
        status: null,
        executionDuration: 0,
        files: {},
      }

      if (!AllSupportedFileExtensions.includes(sourceFileExtensionLowercase as SupportedPhotoFileExtensions | SupportedCinemaFileExtensions | SupportedMusicFileExtensions)) {
        Logger.error(`Unsupported file type ${sourceFileExtension}, ${options?.absoluteFilePath ? options.absoluteFilePath : options?.fileName}`, 'Thumbnails')
        createdThumbnails.status = 'error'
        return allThumbnailsResolve(createdThumbnails)
      }

      const allThumbnailsPerformanceStart = performance.now()

      for (const [size, [width, height]] of Object.entries(options.sizes)) {
        const thumbnailPerformanceStart = performance.now()

        // Create each invividual thumbnail
        // FIXME
        // eslint-disable-next-line no-async-promise-executor
        const thumbnail: CreatedThumbnail = await new Promise(async (thumbnailResolve) => {
          const fileNameWidth = width ? width : 'auto'
          const fileNameHeight = height ? height : 'auto'
          const outputFileName = `${sourceFileNameWithoutExtension}__${groupUuid}__${size}__${fileNameWidth}x${fileNameHeight}.jpeg`
          const outputPath = getAppDir(OutputCacheDirectories.PHOTO_THUMBNAILS, outputFileName)

          let sharpInput: string | Buffer = options?.absoluteFilePath
            ? options.absoluteFilePath
            : options.buffer

          // Convert HEIC to JPG in memory so that it can be used with Sharp
          if (canonicalExtension(sourceFileExtensionLowercase) === SupportedPhotoFileExtensions.HEIF) {
            if (options.absoluteFilePath) {
              sharpInput = await this.photoService.heifToJpeg(options.absoluteFilePath) as Buffer
            } else {
              Logger.error('HEIC binary is unsupported')
              thumbnailResolve(null)
            }
          }

          if (!sharpInput) {
            Logger.error(`Could not create thumbnail for ${options?.absoluteFilePath ? options.absoluteFilePath : options?.fileName} because there was no input data`)
            thumbnailResolve(null)
          }

          const createdThumbnail = await this.createThumbnail({
            sharpInput,
            width,
            height,
            cacheDir: OutputCacheDirectories.PHOTO_THUMBNAILS,
            outputPath,
            outputFileName,
            fit: options.fit,
            position: options.position,
          })

          thumbnailResolve(createdThumbnail)
        })

        createdThumbnails.files[size] = thumbnail

        log(LogModule.JOBS, LogLevel.DEBUG, `Generated thumbnail [width=${width ? width : 'auto'} height=${height ? height : 'auto'} size=${size} time=${Math.round(performance.now() - thumbnailPerformanceStart)}ms] for file ${options?.absoluteFilePath ? options.absoluteFilePath : options?.fileName}`)
      }

      if (Object.values(createdThumbnails.files).some((thumb) => thumb === null)) {
        createdThumbnails.status = 'error'
      } else {
        createdThumbnails.status = 'success'
      }

      createdThumbnails.executionDuration = performance.now() - allThumbnailsPerformanceStart

      allThumbnailsResolve(createdThumbnails)
    })
  }

  /**
   * Converts a thumbnail in a worker thread.
   */
  createThumbnail(input: CreateThumbnailWorkerInput) {
    return new Promise<CreatedThumbnail>((creationResolve) => {
      // This import is required by the library: https://sharp.pixelplumbing.com/install#worker-threads
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('sharp')
      const worker = new worker_threads.Worker(
        path.join(__dirname, 'workers', 'create-thumbnail'),
        {
          workerData: input,
        },
      )
      worker.on('message', (data) => {
        creationResolve(data)
      })
      worker.on('error', (error) => {
        Logger.error(error)
        creationResolve(null)
      })
    })
  }

  /**
   * Delete all cached thumbnail files from the disk.
   */
  async deleteThumbnailFileCache(): Promise<void> {
    try {
      await fsExtra.emptyDirSync(getAppDir(OutputCacheDirectories.PHOTO_THUMBNAILS))
      Logger.log('Deleted all cached thumbnails from file system', 'Thumbnails')
    } catch (error) {
      Logger.error(error?.message, 'Thumbnail')
    }
  }
}
