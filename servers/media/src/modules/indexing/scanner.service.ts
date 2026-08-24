import * as fs from 'fs'
import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { globStream, escape as globEscape } from 'glob'
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

const MUSIC_FILE_EXTENSIONS = new Set<string>(Object.values(SupportedMusicFileExtensions))

export type ScanResults = {
  foundPhotos: string[],
  foundMusic: string[],
  foundMovies: string[],
  foundTV: string[],
  suspectedDuplicatePhotos?: string[],
  musicVerification?: MusicScanVerification,
}

/**
 * The outcome of the post-walk verification passes of a music scan. The walk
 * and the verification passes are both treated as unreliable samples of the
 * file system; the scan only converges when a full pass discovers nothing new.
 */
export type MusicScanVerification = {
  passes: number,
  recoveredFiles: string[],
  unreadableDirs: string[],
  converged: boolean,
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
   * Starts a new scan of the music directory, then verifies the walk before
   * returning. Returns the scan results, including the verification outcome.
   */
  async scanMusic(
    onFileFound: (file, type: MediaType) => void,
    abortController: AbortController,
  ): Promise<ScanResults> {
    const mediaDirs = getMediaDirs()
    const mediaDirPaths = []

    mediaDirPaths.push(`${globEscape(mediaDirs.music)}/**/*.{${Object.values(SupportedMusicFileExtensions).join()}}`)

    Object.keys(mediaDirs).forEach((type) => {
      if (mediaDirs[type]) {
        Logger.log(`Scanning for ${type} in ${mediaDirs[type]}`, 'Indexing')
      }
    })

    const timeoutSeconds = envVar('INDEXING_SCAN_TIMEOUT', 120)
    const cancelMusicScanTimeout = happensInXSeconds(timeoutSeconds, () => {
      Logger.error(`Timed out when scanning for music. ${helpCode('0100')}`)
      abortController.abort()
    })

    log(LogModule.INDEXING, LogLevel.DEBUG, `Starting scan for music with a ${timeoutSeconds} second timeout`)

    try {
      const glob = this.createMusicGlobStream(mediaDirPaths, abortController)

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
        // The walk is unreliable over network mounts; the verification passes
        // below re-enumerate whatever the broken stream did not deliver
        Logger.error(`The music scan walk failed partway (${error?.message}). Verification will attempt to recover the remainder.`, 'Indexing')
        Logger.error(error?.stack, 'Indexing')
      }
    }

    if (!abortController.signal.aborted) {
      this.scanResults.musicVerification = await this.verifyMusicScan(mediaDirs.music, onFileFound, abortController)
    }

    return this.scanResults
  }

  /**
   * Creates the glob stream for the music scan walk.
   */
  protected createMusicGlobStream(patterns: string[], abortController: AbortController) {
    return globStream(patterns, {
      stat: true,
      withFileTypes: true,
      nocase: true,
      signal: abortController.signal,
      ignore: {
        ignored: (p: PathPosix) => this.shouldIgnoreFile(p),
      },
      follow: false,
    })
  }

  /**
   * Guards the music scan against the walk silently missing files, which has
   * been observed over SMB mounts: the mount can return partial directory
   * listings without raising any error, and it can also break the glob stream
   * partway. Neither failure is trusted to be one-off, so this re-enumerates
   * the music directory with plain readdir passes (directories and names only,
   * far cheaper than the stat-heavy walk) until a full pass discovers nothing
   * new, or the pass cap is reached.
   *
   * Recovered files are pushed through the same onFileFound path as the walk,
   * within the same scan phase of the same run. Results are only ever added
   * across passes, never removed, so a flaky verification pass cannot discard
   * files that a previous pass found.
   */
  private async verifyMusicScan(
    musicDir: string,
    onFileFound: (file, type: MediaType) => void,
    abortController: AbortController,
  ): Promise<MusicScanVerification> {
    const maxPasses = Number(envVar('INDEXING_SCAN_VERIFY_PASSES', 4))
    const found = new Set(this.scanResults.foundMusic)

    const verification: MusicScanVerification = {
      passes: 0,
      recoveredFiles: [],
      unreadableDirs: [],
      converged: false,
    }

    while (verification.passes < maxPasses && !abortController.signal.aborted) {
      verification.passes++

      const files: string[] = []
      const unreadableDirs: string[] = []
      await this.walkMusicFiles(musicDir, files, unreadableDirs)

      const fresh = files.filter((file) => !found.has(file))

      for (const file of fresh) {
        found.add(file)
        this.scanResults.foundMusic.push(file)
        verification.recoveredFiles.push(file)
        onFileFound(file, MediaType.MUSIC)
      }

      verification.unreadableDirs = unreadableDirs

      if (fresh.length) {
        log(LogModule.INDEXING, LogLevel.DEBUG, `Music scan verification pass ${verification.passes} discovered ${fresh.length} files that the walk missed`)
      }

      if (!fresh.length && !unreadableDirs.length) {
        verification.converged = true
        break
      }
    }

    if (verification.recoveredFiles.length) {
      Logger.warn(`Music scan verification recovered ${verification.recoveredFiles.length} files that the initial walk missed`, 'Indexing')
    }

    if (!verification.converged && !abortController.signal.aborted) {
      Logger.error(`Music scan verification did not converge after ${verification.passes} passes. ${verification.unreadableDirs.length} directories could not be listed.`, 'Indexing')
    }

    return verification
  }

  /**
   * Recursively collects all supported, non-ignored music files under the
   * given directory using plain readdir calls. Directories that fail to list
   * are collected instead of thrown so a single bad directory cannot end the
   * enumeration.
   */
  private async walkMusicFiles(dir: string, files: string[], unreadableDirs: string[]): Promise<void> {
    let entries: fs.Dirent[]

    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true })
    } catch (error) {
      unreadableDirs.push(dir)
      return
    }

    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        await this.walkMusicFiles(absolutePath, files, unreadableDirs)
      } else if (entry.isFile()) {
        const extension = entry.name.split('.').pop()?.toLowerCase()

        if (MUSIC_FILE_EXTENSIONS.has(extension) && !this.shouldIgnoreFile(absolutePath)) {
          files.push(absolutePath)
        }
      }
    }
  }

  /**
   * Starts a new scan of the photos directory. Returns true if the scan was
   * started, otherwise false.
   */
  async scanPhotos(
    onFileFound: (file, type: MediaType) => void,
    abortController: AbortController,
  ): Promise<boolean> {
    const mediaDirs = getMediaDirs()
    const mediaDirPaths = []

    // We need to know all the Google Photos albums on the disk before we start
    this.googlePhotosAlbumsOnDisk = await this.photoService.readGooglePhotosAlbumsOnDisk(mediaDirs.photos)

    mediaDirPaths.push(`${globEscape(mediaDirs.photos)}/**/*.{${Object.values(SupportedPhotoFileExtensions).join()}}`)

    Object.keys(mediaDirs).forEach((type) => {
      if (mediaDirs[type]) {
        Logger.log(`Scanning for ${type} in ${mediaDirs[type]}`, 'Indexing')
      }
    })

    const timeoutSeconds = envVar('INDEXING_SCAN_TIMEOUT', 120)
    const cancelPhotosScanTimeout = happensInXSeconds(timeoutSeconds, () => {
      Logger.error(`Timed out when scanning for photos. ${helpCode('0100')}`)
      abortController.abort()
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

    return true
  }

  /**
   * File ignore patterns for the scan.
   * 
   * Returns false if the file can be kept. Returns true if the file should be
   * filtered out.
   */
  private shouldIgnoreFile(p: PathPosix | string): boolean {
    const absolutePath = typeof p === 'string' ? p : p.fullpath()

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
