import * as fs from 'fs'
import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'
import * as fileType from 'file-type'

import { Run } from './entities/run.entity'
import { File } from './entities/file.entity'

import { Pagination } from '../../dtos/pagination.dto'

import { EventService } from '../event/event.service'
import {
  IndexingEvents,
  IndexingStartedPayload,
  ScannerStartedPayload,
  ScannerFoundFilesPayload,
} from './events'

import { RunStates, IndexingStates, FileOnDiskIndexingOperation } from './enums'
import { InMemoryRun, InMemoryRunMediaCounts, FileToIndexInQueue, NewRunOptions, InMemoryRunPublic } from './types'

import { ScannerService, ScanResults } from './scanner.service'
import { PhotoIndexingService } from './media/indexing.photos.service'
import { MusicIndexingService } from './media/indexing.music.service'

import { MusicArtist } from '../music-artist/music-artist.entity'
import { MusicArtistMetadata } from '../music-artist/music-artist-metadata.entity'
import { MusicRelease } from '../music-release/music-release.entity'
import { MusicReleaseMetadata } from '../music-release/music-release-metadata.entity'
import { MusicReleaseThumbnail } from '../music-release/music-release-thumbnail.entity'
import { MusicGenre } from '../music-genres/music-genre.entity'
import { MusicTrack } from '../music-track/music-track.entity'
import { MusicTrackMetadata } from '../music-track/music-track-metadata.entity'
import { MusicHistory } from '../music-history/music-history.entity'

import { UserService } from '../user/user.service'

import {
  MediaAppType,
  MediaType,
} from '../../utils/media'
import { makeMediaFilePathRelative } from '../../utils/file'
import { log, LogModule, LogLevel } from '../../utils/logging'

@Injectable()
export class IndexingService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(Run)
    private runRepository: Repository<Run>,
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    @InjectRepository(MusicArtist)
    private musicArtistRepository: Repository<MusicArtist>,
    @InjectRepository(MusicRelease)
    private musicReleaseRepository: Repository<MusicRelease>,
    @InjectRepository(MusicGenre)
    private musicGenreRepository: Repository<MusicGenre>,
    private readonly eventService: EventService,
    private readonly scannerService: ScannerService,
    private readonly photoIndexingService: PhotoIndexingService,
    private readonly musicIndexingService: MusicIndexingService,
    private readonly userService: UserService,
  ) {
    this.eventService.subscribePrivate(this, IndexingEvents.START, this.start.bind(this))
  }

  broadcaster = setInterval(this.updatePublicProgress.bind(this), 500)

  /**
   * The state of the indexing service will change over time and can be
   * controlled by the user. This is the main source of truth for what it's
   * doing at any given moment.
   */
  private state: IndexingStates = IndexingStates.IDLE

  /**
   * The currentRun object is designed to be write-only, public, and
   * serializable, and it will track everything about this run. When the run is
   * complete, the data will be saved and then the object will be reset.
   */
  private currentRun: InMemoryRun | null = null

  /**
   * Reference to the database entity for this run.
   */
  private runEntity = null

  /**
   * All of the files found on the disk are added to this first-in first-out
   * queue for indexing. Each file will be checked to see if it needs to be
   * added, updated, or skipped, and then sent to the appropiate importer method
   * for the media type.
   * 
   * Once all files have been processed and the queue is empty, the run will
   * be completed.
   */
  private filesToIndexQueue: FileToIndexInQueue[] = []

  /**
   * Used to cancel the file system scan. It can only be cancelled, not paused,
   * so if the user pauses during the initial scan phase, we need to rerun the
   * full scan.
   */
  private scannerAbortController: AbortController | null = null
  private nextResumeRequiresRescan = false

  /**
   * Files are found too quickly to do anything meaningful with them on the
   * frontend on a one-by-one basis. Instead, send a frequent updates of the
   * total amount of files so far.
   */
  private filesFoundEventInterval = null
  private filesFoundEventIntervalRate = 500

  /**
   * The pause can only happen after the current file is fully indexed. This
   * flag allows the frontend to queue up a pause at any time.
   */
  private pauseAfterCurrentFileIndexingComplete = false

  /**
   * Create a new run object.
   * 
   * found = file was found on the disk
   * added = it's the first time we see the file, and new entities were created in the database
   * skipped = we've seen the file before and did not detect any changes to it, therefore it was skipped
   * errored = something went wrong when indexing
   * indexed = sum of added, skipped, errored
   */
  newInMemoryRun(id, options: NewRunOptions) {
    const mediaCounts = () => ({ found: [], indexed: 0, added: 0, skipped: 0, errored: 0 })
    return {
      runId: id,
      user: options.user,
      startedAt: Date.now(),
      options,
      music: mediaCounts(),
      photos: mediaCounts(),
      movies: mediaCounts(),
      tv: mediaCounts(),
    } as InMemoryRun
  }

  /**
   * Exposes the private state property.
   */
  getCurrentState() {
    return this.state
  }

  /**
   * Exposes the private currentRun property.
   */
  getCurrentRun() {
    return this.currentRun
  }

  /**
   * Returns a copy of the currentRun object with array lengths instead of the
   * array values with file paths.
   */
  getCurrentRunPublic(): InMemoryRunPublic {
    if (!this.currentRun) {
      return null
    }
    const toPublic = ({ found, ...rest }: InMemoryRunMediaCounts) => ({ found: found.length, ...rest })
    return {
      runId: this.currentRun.runId,
      startedAt: this.currentRun.startedAt,
      options: this.currentRun.options,
      music: toPublic(this.currentRun.music),
      photos: toPublic(this.currentRun.photos),
      movies: toPublic(this.currentRun.movies),
      tv: toPublic(this.currentRun.tv),
    }
  }

  /**
   * Resets the state of this service to the initial state.
   */
  resetState() {
    this.state = IndexingStates.IDLE
    this.runEntity = null
    this.currentRun = null
    this.filesToIndexQueue = []
    this.scannerService.reset()
  }

  /**
   * Clears the interval that handles sending the files_found event. It's no
   * longer needed after the scan is done.
   */
  clearFilesFoundInterval() {
    clearInterval(this.filesFoundEventInterval)
    this.filesFoundEventInterval = null
  }

  /**
   * Counts indexed files.
   */
  async countIndexedFiles() {
    const musicFiles = await this.fileRepository.findAndCount({ where: { mediaType: MediaType.MUSIC }, take: 1, skip: 0 })
    const photoFiles = await this.fileRepository.findAndCount({ where: { mediaType: MediaType.PHOTOS }, take: 1, skip: 0 })
    const movieFiles = await this.fileRepository.findAndCount({ where: { mediaType: MediaType.MOVIES }, take: 1, skip: 0 })
    const tvFiles = await this.fileRepository.findAndCount({ where: { mediaType: MediaType.TV }, take: 1, skip: 0 })

    return {
      musicFiles: musicFiles?.[1] || 0,
      photoFiles: photoFiles?.[1] || 0,
      movieFiles: movieFiles?.[1] || 0,
      tvFiles: tvFiles?.[1] || 0,
    }
  }

  /**
   * Returns all indexing runs in order from newest to oldest.
   */
  async getRuns(pagination: Pagination, includeEmptyRuns = true): Promise<[Run[], number]> {
    const { take, skip } = pagination
    const qb = this.dataSource
      .getRepository(Run)
      .createQueryBuilder('run')
      .where([
        { status: RunStates.STARTED },
        { status: RunStates.COMPLETED },
      ])

    if (!includeEmptyRuns) {
      qb.andWhere((qb) => {
        const sub = qb.subQuery()
          .select('1')
          .from(File, 'file')
          .where('file.run = run.id')
          .getQuery()
        return `EXISTS ${sub}`
      })
    }

    return qb
      .orderBy('run.createdAt', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount()
  }

  /**
   * Given a run ID, this will return all of the files from that run that are
   * currently indexed.
   */
  async getIndexedFilesFromRun(mediaType: MediaType, runId): Promise<[Run, File[]]> {
    const run = await this.dataSource
      .getRepository(Run)
      .createQueryBuilder()
      .where('runId = :runId', { runId })
      .getOne()

    const files = await this.dataSource
      .getRepository(File)
      .createQueryBuilder('file')
      // FIXME this should be app: AppType, or add mediaType to the entity
      .where('file.app = :app', { app: mediaType })
      .andWhere('file.runId = :id', { id: run.id })
      .getMany()

    return [run, files]
  }

  /**
   * Main method for starting a new indexing run. This will create a new run
   * entity in the database and kick off the indexing operation.
   * 
   * The returned run entity here will be in the state from the moment *before*
   * the run actually starts. So, to know when the run *actually* starts, listen
   * for the event or check the state of the current run with the REST endpoint.
   */
  async start(options?: NewRunOptions): Promise<Run> {
    if (this.state !== IndexingStates.IDLE) {
      throw new Error('Cannot start new indexing run while one is already running.')
    }
    if (this.currentRun !== null) {
      throw new Error('State issue detected with the indexing service. Refusing to start a new run.')
    }
    if (!options.user) {
      throw new Error('Missing user.')
    }

    this.runEntity = await this.runRepository.save({
      runId: uuid(),
      status: RunStates.NOT_STARTED,
    })

    const { runId } = this.runEntity
    this.state = IndexingStates.INDEXING
    this.currentRun = this.newInMemoryRun(runId, options)

    const indexingStartedPayload: IndexingStartedPayload = { runId, startedAt: this.currentRun.startedAt }
    this.eventService.emitAll(IndexingEvents.STARTED, indexingStartedPayload)

    await this.dataSource
      .createQueryBuilder()
      .update(Run)
      .set({ status: RunStates.STARTED })
      .where('runId = :runId', { runId })
      .execute()

    this.scan()

    return this.runEntity
  }

  /**
   * Pauses the indexing service after the current file has completed indexing.
   *
   * This is not an async method. The pause operation is indeed async, but this
   * function does not wait for it to happen before returning. The boolean
   * returned here indicates whether the paused was queued up or not. To know
   * when the service has actually paused, listen for the `paused` event.
   *
   * If the pause occurs during the glob scan of the disk, the scan will be
   * discarded.
   */
  pause(): boolean {
    if (this.state !== IndexingStates.INDEXING) {
      return false
    }

    // A non-null AbortController means the scan is running
    if (this.scannerAbortController instanceof AbortController) {
      Logger.log('Aborting scan', 'Indexing')
      this.scannerAbortController.abort()
      this.scannerAbortController = null
      this.currentRun.music.found = []
      this.currentRun.photos.found = []
      this.currentRun.movies.found = []
      this.currentRun.tv.found = []
      this.filesToIndexQueue = []
      this.nextResumeRequiresRescan = true
      this.scannerService.reset()
      this.pauseForReal()
    }

    this.pauseAfterCurrentFileIndexingComplete = true

    Logger.log(`Indexing paused`, 'Indexing')

    return true
  }

  /**
   * This will actually change the state to paused at right this moment.
   */
  private async pauseForReal() {
    this.pauseAfterCurrentFileIndexingComplete = false
    this.state = IndexingStates.PAUSED
    this.eventService.emitPublic(IndexingEvents.PAUSED)
  }

  /**
   * Resumes the indexing service. Returns true if the resume was successful,
   * otherwise false.
   */
  resume(): boolean {
    if (this.state !== IndexingStates.PAUSED) {
      return false
    }

    this.state = IndexingStates.INDEXING

    // If the user paused during the initial scan, the next resume will need to
    // rescan everything
    if (this.nextResumeRequiresRescan) {
      this.nextResumeRequiresRescan = false
      this.scan()
    } else {
      this.importLoop()
    }

    this.eventService.emitPublic(IndexingEvents.RESUMED)

    Logger.log(`Indexing resumed`, 'Indexing')

    return true
  }

  /**
   * Manaully stops the indexing service before it completes normally.
   * 
   * Returns true if the stop was successful, otherwise false.
   */
  async stop(): Promise<boolean> {
    if (this.state === IndexingStates.INDEXING || this.state === IndexingStates.PAUSED) {
      this.eventService.emitPublic(IndexingEvents.STOPPED)
      await this.complete(true)
      Logger.log(`Indexing stopped`, 'Indexing')
      return true
    } else {
      return false
    }
  }

  /**
   * The last step of an indexing run. This will reset the indexing service
   * state and emit the final event.
   */
  private async complete(stoppedByUser = false): Promise<void> {
    const totalAdded = this.currentRun.music.indexed + this.currentRun.photos.indexed + this.currentRun.movies.indexed + this.currentRun.tv.indexed
    const totalSkipped = this.currentRun.music.skipped + this.currentRun.photos.skipped + this.currentRun.movies.skipped + this.currentRun.tv.skipped

    Logger.log(`Indexed ${totalAdded} files this run`, 'Indexing')
    Logger.log(`Skipped ${totalSkipped} files this run; files are skipped when they have not changed since the last run`, 'Indexing')

    const endingRunStatus = stoppedByUser
      ? RunStates.STOPPED_BY_USER
      : RunStates.COMPLETED

    if (this.filesToIndexQueue.length) {
      Logger.warn('Indexing was completed without an empty queue. This is probably a bug.', 'Indexing')
    }

    await this.dataSource
      .createQueryBuilder()
      .update(Run)
      .set({ status: endingRunStatus })
      .where('runId = :runId', { runId: this.currentRun.runId })
      .execute()

    this.eventService.emitAll(IndexingEvents.CURRENT_PROGRESS, this.getCurrentRunPublic())
    this.eventService.emitAll(IndexingEvents.COMPLETED, this.getCurrentRunPublic())

    if (this.dataSource.options.type === 'postgres') {
      await this.analyzeIndexedTables()
    }

    this.resetState()

    Logger.log(`Indexing run complete`, 'Indexing')
  }

  /**
   * Refreshes the PostgreSQL query planner's statistics after a bulk insert
   * run. Without this, the planner uses stale row-count estimates that can
   * lead to poor query plans until the autovacuum daemon catches up.
   */
  private async analyzeIndexedTables(): Promise<void> {
    const tables = ['file', 'music_track', 'music_release', 'music_artist', 'music_track_metadata', 'music_release_metadata']
    for (const table of tables) {
      await this.dataSource.query(`ANALYZE ${table}`)
    }
    Logger.log('ANALYZE complete on indexed tables', 'Indexing')
  }

  /**
   * Scans for files asynchronously. Each file that is found will be added to
   * the import queue, and an event will be emitted.
   */
  private scan(): void {
    this.eventService.emitPublic(IndexingEvents.SCAN_STARTED, { runId: this.currentRun.runId } as ScannerStartedPayload)

    log(LogModule.INDEXING, LogLevel.DEBUG, 'Starting scan')

    this.filesFoundEventInterval = setInterval(() => {
      // Indexing may have been cancelled by the time this inverval runs
      if (this.currentRun) {
        const fileFoundPayload: ScannerFoundFilesPayload = {
          filesFound: this.currentRun.music.found.length + this.currentRun.photos.found.length + this.currentRun.movies.found.length + this.currentRun.tv.found.length,
        }
        this.eventService.emitPublic(IndexingEvents.FILES_FOUND, fileFoundPayload)
      }
    }, this.filesFoundEventIntervalRate)

    // Whenever a file is found
    const onFileFound = (path, mediaType: MediaType) => {
      log(LogModule.INDEXING, LogLevel.DEBUG, `Found file ${path.split('/').pop()}`)

      const fileToIndex: FileToIndexInQueue = { path, mediaType }

      this.currentRun[mediaType].found.push(path)
      this.filesToIndexQueue.push(fileToIndex)
    }

    // When the scan is complete
    const onScanComplete = (scanResults: ScanResults) => {
      //const musicFound = scanResults.foundMusic.length
      const photosFound = scanResults.foundPhotos.length
      //const moviesFound = scanResults.foundMovies.length
      //const tvFound = scanResults.foundTV.length
      const completedPayload = this.getCurrentRunPublic()

      this.eventService.emitPublic(IndexingEvents.SCAN_COMPLETED, completedPayload)

      log(LogModule.INDEXING, LogLevel.DEBUG, `Scan complete - found ${photosFound} photos`)

      this.scannerAbortController = null
      this.clearFilesFoundInterval()
      this.importLoop()
    }

    this.scannerAbortController = new AbortController()

    this.scannerService.scan(onFileFound, onScanComplete, this.scannerAbortController, {
      music: this.currentRun.options.mediaTypes.music,
      photos: this.currentRun.options.mediaTypes.photos,
      movies: this.currentRun.options.mediaTypes.movies,
      tv: this.currentRun.options.mediaTypes.tv,
    })
  }

  /**
   * Compares a file on the disk to the indexed reference of it to determine
   * what we should do with the file.
   * 
   * There are three determinations that can be made:
   * 
   * 1. It's a new file that has never been seen before, and it needs to be
   *    indexed.
   * 2. It's a file that we have seen before but it has changed in some way
   *    since we last saw it, so we need to reindex it. Note that filenames
   *    cannot change since they are the canonical reference. What can change is
   *    the embedded metadata.
   * 3. It's a file that we have seen before but it hasn't changed since we last
   *    saw it, so we can skip it.
   */
  private async compareFileOnDiskAgainstIndex(absolutePath: string): Promise<FileOnDiskIndexingOperation> {
    const relativePath = makeMediaFilePathRelative(absolutePath)
    const indexedReference = await this.fileRepository.findOne({
      where: { relativePath },
    })

    if (!indexedReference) {
      return FileOnDiskIndexingOperation.ADD
    }

    try {
      const stats = fs.statSync(absolutePath)
      const sizeChanged = stats.size !== indexedReference.size
      const mtimeChanged = indexedReference.mtime == null || stats.mtime.getTime() !== indexedReference.mtime.getTime()

      if (sizeChanged || mtimeChanged) {
        return FileOnDiskIndexingOperation.UPDATE
      }
    } catch (error) {
      Logger.error(`Could not stat file for change detection: ${absolutePath}`, 'Indexing')
    }

    return FileOnDiskIndexingOperation.SKIP
  }

  /**
   * The main loop of the indexing service. Can be paused and restarted, and
   * automatically triggers the completion of the run after all files are indexed.
   */
  private async importLoop() {
    // If the scan was terminated early, let's just wait for the user to unpause and rescan
    if (this.nextResumeRequiresRescan) {
      return Logger.log('Not indexing files until rescan', 'Indexing')
    }

    // The scan may have found nothing
    if (!this.filesToIndexQueue.length) {
      Logger.log('No files were found', 'Indexing')
      return await this.complete()
    }

    while (this.state === IndexingStates.INDEXING && this.filesToIndexQueue.length) {
      // Get the last item without removing it from the queue
      const fileToIndex = this.filesToIndexQueue[this.filesToIndexQueue.length - 1]
      const filePath = fileToIndex.path
      const mediaType = fileToIndex.mediaType

      //const fileName = filePath.split(path.sep).pop()
      const requiredAction = await this.compareFileOnDiskAgainstIndex(filePath)

      switch (requiredAction) {
        case FileOnDiskIndexingOperation.ADD:
          await this.indexFile(filePath, mediaType)
          break

        case FileOnDiskIndexingOperation.UPDATE:
          await this.updateFile(filePath, mediaType)
          break

        case FileOnDiskIndexingOperation.SKIP:
          await this.skipFile(filePath, mediaType)
          break
      }

      if (this.currentRun) {
        // Remove the item from the queue
        this.filesToIndexQueue.pop()
      }

      // Indexing queue is empty and has completed naturally
      if (this.filesToIndexQueue.length === 0) {
        await this.complete()
      }

      if (this.pauseAfterCurrentFileIndexingComplete) {
        this.pauseForReal()
      }
    }
  }

  /**
   * Handles importing a file when it's the first time we've seen the file.
   * 
   * The entities that are created by this operation will be announced via the
   * eventService.
   */
  private async indexFile(absolutePath: string, mediaType: MediaType): Promise<void> {
    const relativePath = makeMediaFilePathRelative(absolutePath)
    const extension = absolutePath.split('.').pop().toLowerCase()
    let mimeType
    let size
    let mtime: Date

    try {
      const info = await fileType.fromFile(absolutePath)
      mimeType = info?.mime
    } catch (error) {
      Logger.error(`Error parsing mime type. ${error?.message}`, 'Indexing')
    }

    try {
      const stats = fs.statSync(absolutePath)
      size = stats?.size || 0
      mtime = stats?.mtime || null
    } catch (error) {
      Logger.error(`Error reading file stats for ${absolutePath}. ${error?.message}`, 'Indexing')
    }

    let app

    if (mediaType === MediaType.PHOTOS) {
      app = MediaAppType.PHOTOS
    } else if (mediaType === MediaType.MUSIC) {
      app = MediaAppType.MUSIC
    } else if (mediaType === MediaType.MOVIES || mediaType === MediaType.TV) {
      app = MediaAppType.CINEMA
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    let file

    try {
      file = await queryRunner.manager.save(File, {
        run: this.runEntity,
        fileId: uuid(),
        absolutePath,
        relativePath,
        extension,
        app,
        mediaType,
        mimeType,
        size,
        mtime,
        lastSeen: new Date(),
        user: this.currentRun.user,
      } as Partial<File>)

      switch(mediaType) {
        // The file is a photo
        case MediaType.PHOTOS:
          await this.photoIndexingService.indexPhotoEntities(file, queryRunner)
          log(LogModule.INDEXING, LogLevel.DEBUG, `Indexed file: ${relativePath}`)
          if (this.currentRun) this.currentRun[mediaType].added++ // User may have stopped the run while indexing the photo
          break

        // The file is a music track
        case MediaType.MUSIC:
          await this.musicIndexingService.indexMusicTrackEntities(file, queryRunner)
          log(LogModule.INDEXING, LogLevel.DEBUG, `Indexed file: ${relativePath}`)
          break

        // The file is a movie or a TV episode
        case MediaType.MOVIES:
        case MediaType.TV:
          log(LogModule.INDEXING, LogLevel.DEBUG, `Cannot index this cinema file yet ${relativePath}`)
          break

        default:
          throw new Error('Unsupported file type at import time')
      }

      await queryRunner.commitTransaction()

      this.currentRun[mediaType].indexed++

      this.eventService.emitPrivate(IndexingEvents.FILE_INDEXED, {
        mediaType,
      })
    } catch (error) {
      Logger.error(`Could not index ${relativePath} because of an error: ${error?.message}`, 'Indexing')
      Logger.error(error?.stack, 'Indexing')
      await queryRunner.rollbackTransaction()
      this.currentRun[mediaType].errored++
      this.eventService.emitPrivate(IndexingEvents.FILE_ERRORED, {
        mediaType,
      })
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Handles skipping a file.
   */
  private async skipFile(_absolutePath: string, mediaType: MediaType): Promise<void> {
    this.currentRun[mediaType].skipped++
    this.eventService.emitPrivate(IndexingEvents.FILE_SKIPPED, {
      mediaType,
    })
  }

  /**
   * Handles updating the entities of a file that was previously indexed.
   */
  private async updateFile(absolutePath: string, mediaType: MediaType): Promise<void> {
    const relativePath = makeMediaFilePathRelative(absolutePath)

    let size: number
    let mtime: Date

    try {
      const stats = fs.statSync(absolutePath)
      size = stats?.size || 0
      mtime = stats?.mtime || null
    } catch (error) {
      Logger.error(`Error reading file stats for ${absolutePath}. ${error?.message}`, 'Indexing')
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const file = await queryRunner.manager.findOne(File, {
        where: { relativePath },
        relations: { musicTrack: true, photo: true },
      })

      await queryRunner.manager.save(File, {
        id: file.id,
        size,
        mtime,
        lastSeen: new Date(),
      })

      switch (mediaType) {
        case MediaType.PHOTOS:
          await this.photoIndexingService.updatePhotoEntities(file, file.photo, queryRunner)
          log(LogModule.INDEXING, LogLevel.DEBUG, `Updated file: ${relativePath}`)
          break

        case MediaType.MUSIC:
          await this.musicIndexingService.updateMusicTrackEntities(file, file.musicTrack[0], queryRunner)
          log(LogModule.INDEXING, LogLevel.DEBUG, `Updated file: ${relativePath}`)
          break

        case MediaType.MOVIES:
        case MediaType.TV:
          log(LogModule.INDEXING, LogLevel.DEBUG, `Cannot update this cinema file yet: ${relativePath}`)
          break

        default:
          throw new Error('Unsupported file type at update time')
      }

      await queryRunner.commitTransaction()

      this.currentRun[mediaType].indexed++

      this.eventService.emitPrivate(IndexingEvents.FILE_UPDATED, {
        mediaType,
      })
    } catch (error) {
      Logger.error(`Could not update ${relativePath} because of an error: ${error?.message}`, 'Indexing')
      Logger.error(error?.stack, 'Indexing')
      await queryRunner.rollbackTransaction()
      this.currentRun[mediaType].errored++
      this.eventService.emitPrivate(IndexingEvents.FILE_ERRORED, {
        mediaType,
      })
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Hard deletes all indexed data from the database.
   */
  async deleteAllIndexedData() {
    Logger.log('Starting to deindex files.', 'Indexing')
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      if (this.dataSource.options.type === 'postgres') {
        // Truncate all tables in one statement so PostgreSQL can resolve
        // FK constraints between them without erroring
        const tables = [MusicHistory, MusicTrackMetadata, MusicArtistMetadata, MusicReleaseMetadata, MusicReleaseThumbnail, MusicTrack, File, MusicRelease, MusicArtist, MusicGenre]
          .map((e) => `"${this.dataSource.getMetadata(e).tableName}"`)
          .join(', ')
        await queryRunner.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`)
      } else {
        // SQLite: clear() uses DELETE internally; order matters for FK checks
        await queryRunner.manager.clear(MusicHistory)
        await queryRunner.manager.clear(MusicTrackMetadata)
        await queryRunner.manager.clear(MusicArtistMetadata)
        await queryRunner.manager.clear(MusicReleaseMetadata)
        await queryRunner.manager.clear(MusicReleaseThumbnail)
        await queryRunner.manager.clear(MusicTrack)
        await queryRunner.manager.clear(File)
        await queryRunner.manager.clear(MusicRelease)
        await queryRunner.manager.clear(MusicArtist)
        await queryRunner.manager.clear(MusicGenre)
      }

      await queryRunner.commitTransaction()
      Logger.log('Deindexed all files.', 'Indexing')
      return true
    } catch (e) {
      console.error(e)
      await queryRunner.rollbackTransaction()
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Deindexes files. This can soft delete files, or hard delete all files and
   * all their entities.
   */
  async deindexFiles(ids, hardDelete = false): Promise<Record<string, boolean>> {
    const criteria = ids.map((id) => ({ fileId: id }))
    const deleted = {}

    for (const file of criteria) {
      try {
        let result

        if (hardDelete) {
          result = await this.fileRepository.delete(file)
        } else {
          result = await this.fileRepository.softDelete(file)
        }

        if (result?.affected !== 1) {
          Logger.warn(`The file ${file.fileId} was not deindexed because that ID was not found in the database`, 'Indexing')
          deleted[file.fileId] = false
          continue
        }

        log(LogModule.INDEXING, LogLevel.DEBUG, `Deindexed file ${file}`)

        deleted[file.fileId] = true
      } catch (error) {
        deleted[file.fileId] = false
        log(LogModule.INDEXING, LogLevel.DEBUG, `Could not deindex file ${file}`)
      }
    }

    return deleted
  }

  /**
   * Broadcasts information about indexing every x seconds.
   */
  async updatePublicProgress() {
    if (this.state === IndexingStates.INDEXING) {
      const { music, photos, movies, tv, startedAt } = this.getCurrentRunPublic()
      this.eventService.emitPublic(IndexingEvents.CURRENT_PROGRESS, {
        startedAt,
        music,
        photos,
        movies,
        tv,
      })
    }
  }
}
