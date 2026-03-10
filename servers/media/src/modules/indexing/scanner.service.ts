import * as fs from 'fs'
import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { globStream } from 'glob'
import { PathPosix } from 'path-scurry'

import { File } from './entities/file.entity'
import { PhotoService } from '../photo/photo.service'

import { envVar, getMediaDirs } from '../../utils/env'
import { helpCode } from '../../utils/help-codes'
import { happensInXSeconds } from '../../utils/time'
import {
  SupportedPhotoFileExtensions,
  SupportedMusicFileExtensions,
  MediaType,
} from '../../utils/media'
import { log, LogModule, LogLevel } from '../../utils/logging'

export type ScanResults = {
  foundPhotos: string[],
  foundMusic: string[],
  foundMovies: string[],
  foundTV: string[],
  suspectedDuplicatePhotos?: string[],
}

@Injectable()
export class ScannerService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    private readonly photoService: PhotoService,
  ) {}

  private scanResults: ScanResults = {
    foundPhotos: [],
    foundMusic: [],
    foundMovies: [],
    foundTV: [],
  }

  private googlePhotosAlbumsOnDisk: string[] = []
  private ignoredFiles: string[] = []
  private suspectedDuplicates: string[] = []

  /**
   * Reset the state of the scanner service.
   */
  reset(): void {
    this.scanResults.foundPhotos = []
    this.scanResults.foundMusic = []
    this.scanResults.foundMovies = []
    this.scanResults.foundTV = []
  }

  /**
   * Starts a new scan of all media directories. Returns true if the scan was
   * started, otherwise false.
   */
  async scan(
    onFileFound: (file, type: MediaType) => void,
    onScanComplete: (number, OnScanCompleteData?) => void,
    abortController: AbortController,
    mediaTypes: { [MediaType.PHOTOS]: boolean, [MediaType.MUSIC]: boolean, [MediaType.MOVIES]: boolean, [MediaType.TV]: boolean },
  ): Promise<void> {
    const mediaDirs = getMediaDirs()

    if (!Object.keys(mediaDirs).length) {
      Logger.warn('Scan skipped because there are no media directories', 'Indexing')
      return onScanComplete(0)
    }

    // Verify that all media dirs are readable
    await Promise.all(Object.values(mediaDirs).map((dir) => {
      return new Promise((resolve) => {
        if (dir) {
          try {
            fs.access(dir, fs.constants.R_OK, (error) => {
              if (error) {
                Logger.error(`Cannot read media directory: ${dir}`)
                mediaDirs.photos = null
              } else {
                log(LogModule.INDEXING, LogLevel.DEBUG, `Media directory is readable: ${dir}`)
              }
              resolve(true)
            })
          } catch (error) {
            resolve(true)
          }
        } else {
          resolve(true)
        }
      })
    }))

    if (mediaTypes[MediaType.MUSIC] && mediaDirs?.music) {
      await this.scanMusic(onFileFound, abortController)
    }

    if (mediaTypes[MediaType.PHOTOS] && mediaDirs?.photos) {
      await this.scanPhotos(onFileFound, abortController)
    }

    // TODO: other media dirs

    this.ignoredFiles = []
    onScanComplete(this.scanResults)
  }

  /**
   * Starts a new scan of the music directory. Returns true if the scan was
   * started, otherwise false.
   */
  scanMusic(
    onFileFound: (file, type: MediaType) => void,
    abortController: AbortController,
  ): Promise<boolean> {
    // FIXME
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const mediaDirs = getMediaDirs()
      const mediaDirPaths = []

      mediaDirPaths.push(`${mediaDirs.music}/**/*.{${Object.values(SupportedMusicFileExtensions).join()}}`)

      Object.keys(mediaDirs).forEach((type) => {
        if (mediaDirs[type]) {
          Logger.log(`Scanning for ${type} in ${mediaDirs[type]}`, 'Indexing')
        }
      })

      const timeoutSeconds = envVar('INDEXING_SCAN_TIMEOUT', 120)
      const cancelMusicScanTimeout = happensInXSeconds(timeoutSeconds, () => {
        Logger.error(`Timed out when scanning for music. ${helpCode('0100')}`)
        abortController.abort()
        resolve(true)
      })

      log(LogModule.INDEXING, LogLevel.DEBUG, `Starting scan for music with a ${timeoutSeconds} second timeout`)

      try {
        const glob = globStream(mediaDirPaths, {
          stat: true,
          withFileTypes: true,
          nocase: true,
          signal: abortController.signal,
          ignore: {
            ignored: (p: PathPosix) => this.shouldIgnoreFile(p),
          },
          follow: false,
        })

        for await (const found of glob) {
          // Cancel the timeout when we find the first file
          cancelMusicScanTimeout()

          const file = found.fullpath()
          this.scanResults.foundMusic.push(file)
          onFileFound(file, MediaType.MUSIC)
        }
      } catch (error) {
        if (error?.message === 'stream destroyed') {
          Logger.warn('Indexing was paused during the initial scan. The music scan in progress has been discarded, and a new scan will begin when indexing is resumed.', 'Indexing')
        } else {
          Logger.error(error, 'Indexing')
        }
      }

      resolve(true)
    })
  }

  /**
   * Starts a new scan of the photos directory. Returns true if the scan was
   * started, otherwise false.
   */
  scanPhotos(
    onFileFound: (file, type: MediaType) => void,
    abortController: AbortController,
  ): Promise<boolean> {
    // FIXME
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const mediaDirs = getMediaDirs()
      const mediaDirPaths = []

      // We need to know all the Google Photos albums on the disk before we start
      this.googlePhotosAlbumsOnDisk = await this.photoService.readGooglePhotosAlbumsOnDisk(mediaDirs.photos)

      mediaDirPaths.push(`${mediaDirs.photos}/**/*.{${Object.values(SupportedPhotoFileExtensions).join()}}`)

      Object.keys(mediaDirs).forEach((type) => {
        if (mediaDirs[type]) {
          Logger.log(`Scanning for ${type} in ${mediaDirs[type]}`, 'Indexing')
        }
      })

      const timeoutSeconds = envVar('INDEXING_SCAN_TIMEOUT', 120)
      const cancelPhotosScanTimeout = happensInXSeconds(timeoutSeconds, () => {
        Logger.error(`Timed out when scanning for photos. ${helpCode('0100')}`)
        abortController.abort()
        resolve(true)
      })

      log(LogModule.INDEXING, LogLevel.DEBUG, `Starting scan for photos with a ${timeoutSeconds} second timeout`)

      try {
        const glob = globStream(mediaDirPaths, {
          stat: true,
          withFileTypes: true,
          nocase: true,
          signal: abortController.signal,
          ignore: {
            ignored: (p: PathPosix) => this.shouldIgnoreFile(p),
          },
          follow: false,
        })

        for await (const found of glob) {
          // Cancel the timeout when we find the first file
          cancelPhotosScanTimeout()

          const file = found.fullpath()
          if (!this.suspectedDuplicates.includes(file)) {
            this.scanResults.foundPhotos.push(file)
            onFileFound(file, MediaType.PHOTOS)
          }
        }
      } catch (error) {
        if (error?.message === 'stream destroyed') {
          Logger.warn('Indexing was paused during the initial scan. The photos scan in progress has been discarded, and a new scan will begin when indexing is resumed.', 'Indexing')
        } else {
          Logger.error(error, 'Indexing')
        }
      }

      if (this.suspectedDuplicates.length) {
        const dedupedSuspected = [...new Set(this.suspectedDuplicates)]
        log(LogModule.INDEXING, LogLevel.INFO, `Skipping ${dedupedSuspected.length} duplicate Google Photos`)
      }

      this.googlePhotosAlbumsOnDisk = []
      this.suspectedDuplicates = []

      resolve(true)
    })
  }

  /**
   * File ignore patterns for the scan.
   * 
   * Returns false if the file can be kept. Returns true if the file should be
   * filtered out.
   */
  private shouldIgnoreFile(p: PathPosix): boolean {
    const absolutePath = p.fullpath()

    if (
      /@eaDir/i.test(absolutePath) // Synology thumbnail cache dir
      || /SYNOFILE_THUMB/i.test(absolutePath) // Synology thumbnail cache filename; not sure if these can be found outside the @eaDir dir
      || this.shouldIgnorePhoto(absolutePath)
    ) {
      this.ignoredFiles.push(absolutePath)
      return true
    }

    return false
  }

  /**
   * Determine if we should index any given photo. This runs every time a file
   * path is found on the disk.
   *  
   * The Google Takeout data contains many duplicate photos. Each file in a
   * photo album is a duplicate of one in the main archive, and I also
   * experienced a case where I had duplicate photos in a folder that was not
   * the main archive and not a photo album.
   */
  private shouldIgnorePhoto = (absolutePath) => {
    // Handle Google Photos
    if (this.photoService.isFromGooglePhotos(absolutePath)) {
      const isInPhotoAlbum = !!this.googlePhotosAlbumsOnDisk.find((albumPath) => {
        return absolutePath.includes(albumPath)
      })

      // Do not index Google Photos that are in a photo album directory
      if (isInPhotoAlbum) {
        log(LogModule.INDEXING, LogLevel.DEBUG, `Ignored Google Photo because it's a duplicate: ${absolutePath}`)
        this.suspectedDuplicates.push(absolutePath)
        return true
      }

      const archiveYear = this.photoService.getGooglePhotosArchiveYearFromPath(absolutePath)

      // The best way to detect a photo album that is missing its metadata.json
      // file is to check if it's a yearly archive folder, and if not, assume
      // it's a named album with duplicates.
      if (!archiveYear) {
        this.suspectedDuplicates.push(absolutePath)
        return true
      }
    }

    return false
  }
}
