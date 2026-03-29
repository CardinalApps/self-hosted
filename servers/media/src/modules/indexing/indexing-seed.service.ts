import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Like, Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'

import { File } from './entities/file.entity'
import { Run } from './entities/run.entity'
import { User } from '../user/user.entity'
import { MusicIndexingService } from './media/indexing.music.service'
import { envVar } from '../../utils/env'

const BATCH_SIZE = 100
const ALBUMS_PER_ARTIST = 10
const TRACKS_PER_ALBUM = 10

/**
 * Seeds the database with millions of mock music files for load testing.
 * Requires KIOSK_MODE=true.
 *
 * File path structure mirrors the music indexing conventions:
 *   /kiosk/artist-{n}/artist-{n}-release-{r}/artist-{n}-release-{r}-track-{t}.mp3
 */
@Injectable()
export class IndexingSeedLargeService {
  private readonly logger = new Logger(IndexingSeedLargeService.name)

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Run)
    private readonly runRepository: Repository<Run>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly musicIndexingService: MusicIndexingService,
  ) {}

  seed(count: number): void {
    this.runSeed(count).catch((err) => this.logger.error(err))
  }

  private async runSeed(totalFiles: number): Promise<void> {
    if (!envVar('KIOSK_MODE', false)) {
      throw new Error('KIOSK_MODE must be enabled to run large-scale seeding.')
    }

    const user = await this.userRepository.findOne({ where: {} })
    if (!user) {
      throw new Error('No user found in database. Cannot seed without a user.')
    }

    const run = this.runRepository.create({ runId: uuid(), status: 'seeding' })
    await this.runRepository.save(run)

    const alreadySeeded = await this.fileRepository.count({ where: { absolutePath: Like('/kiosk/%') } })
    const resumeFrom = alreadySeeded
    if (resumeFrom > 0) {
      this.logger.log(`Resuming from file ${(resumeFrom + 1).toLocaleString()} (${resumeFrom.toLocaleString()} already seeded)`)
    }
    this.logger.log(`Starting large-scale seed: ${totalFiles.toLocaleString()} files`)

    let totalIndexed = 0
    let batch: SeedFile[] = []

    const startArtist  = Math.floor(resumeFrom / (ALBUMS_PER_ARTIST * TRACKS_PER_ALBUM)) + 1
    const startRelease = Math.floor((resumeFrom % (ALBUMS_PER_ARTIST * TRACKS_PER_ALBUM)) / TRACKS_PER_ALBUM) + 1
    const startTrack   = (resumeFrom % TRACKS_PER_ALBUM) + 1

    outer:
    for (let artistNum = startArtist; ; artistNum++) {
      for (let releaseNum = artistNum === startArtist ? startRelease : 1; releaseNum <= ALBUMS_PER_ARTIST; releaseNum++) {
        for (let trackNum = artistNum === startArtist && releaseNum === startRelease ? startTrack : 1; trackNum <= TRACKS_PER_ALBUM; trackNum++) {
          if (totalIndexed + batch.length >= totalFiles) break outer

          batch.push({ artistNum, releaseNum, trackNum })

          if (batch.length >= BATCH_SIZE) {
            await this.processBatch(batch, run, user)
            totalIndexed += batch.length
            batch = []

            this.logger.log(`Seeded ${totalIndexed.toLocaleString()} / ${totalFiles.toLocaleString()} files (${(resumeFrom + totalIndexed).toLocaleString()} total)`)
          }
        }
      }
    }

    if (batch.length > 0) {
      await this.processBatch(batch, run, user)
      totalIndexed += batch.length
    }

    this.logger.log(`Seed complete: ${totalIndexed.toLocaleString()} files indexed (${(resumeFrom + totalIndexed).toLocaleString()} total)`)
  }

  private async processBatch(batch: SeedFile[], run: Run, user: User): Promise<void> {
    for (const item of batch) {
      const absolutePath = buildAbsolutePath(item)

      const queryRunner = this.dataSource.createQueryRunner()
      await queryRunner.connect()
      await queryRunner.startTransaction()

      try {
        const file = await queryRunner.manager.save(File, {
          run,
          user,
          fileId: uuid(),
          absolutePath,
          relativePath: absolutePath,
          extension: 'mp3',
          app: 'music',
          mediaType: 'music',
          mimeType: 'audio/mpeg',
          size: 0,
          lastSeen: new Date(),
        } as Partial<File>)

        await this.musicIndexingService.indexMusicTrackEntities(file, queryRunner)
        await queryRunner.commitTransaction()
      } catch (error) {
        await queryRunner.rollbackTransaction()
        this.logger.error(`Failed to index ${absolutePath}: ${error?.message}`)
      } finally {
        await queryRunner.release()
      }
    }
  }
}

type SeedFile = {
  artistNum: number
  releaseNum: number
  trackNum: number
}

function buildAbsolutePath({ artistNum, releaseNum, trackNum }: SeedFile): string {
  return `/kiosk/artist-${artistNum}/artist-${artistNum}-release-${releaseNum}/artist-${artistNum}-release-${releaseNum}-track-${trackNum}.mp3`
}
