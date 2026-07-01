import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'

import { IndexingService } from './indexing.service'
import { RunType } from './enums'
import { Library } from '../library/library.entity'
import { LibraryService } from '../library/library.service'
import { User } from '../user/user.entity'
import { UserService } from '../user/user.service'

import { getMediaDirs } from '../../utils/env'
import { generateCover, resolveSampleDir, listSampleFiles, sanitizeSegment, randomInt } from './seed/seed-common'
import { buildDemoLibraries, countTracks, DemoLibrary } from './seed/seed-genres'

const DEFAULT_DEMO_USERNAME = 'ireadinstructions'

export interface DemoSeedOptions { username?: string, scale?: number }
export interface DemoSeedPlan {
  username: string
  musicDir: string
  libraries: { genre: string, artists: number, tracks: number }[]
  plannedTracks: number
}

/*
 * Builds the public Music demo dataset: a small, believable, genre-organised
 * catalogue on the /music mount, grouped into Libraries. Every track is a copy
 * of a bundled sample (kiosk plays those), and every album gets a generated
 * cover. Intended to be triggered once via POST /index/seed/demo in kiosk mode.
 */
@Injectable()
export class IndexingSeedDemoService {
  private readonly logger = new Logger(IndexingSeedDemoService.name)

  constructor(
    private readonly indexingService: IndexingService,
    private readonly libraryService: LibraryService,
    private readonly userService: UserService,
    @InjectRepository(Library)
    private readonly libraryRepository: Repository<Library>,
  ) {}

  // Validates + enables the demo user and plans the catalogue synchronously,
  // then runs the heavy filesystem write + reindex in the background (writing
  // ~500 files to the SMB mount can exceed an HTTP timeout). Returns the plan.
  async start(options: DemoSeedOptions = {}): Promise<DemoSeedPlan> {
    const username = options.username || DEFAULT_DEMO_USERNAME
    const scale = options.scale && options.scale > 0 ? options.scale : 1

    const musicDir = getMediaDirs().music
    if (!musicDir) {
      throw new Error('No music directory is configured/mounted; cannot seed the demo.')
    }

    const user = await this.userService.setEnabled(username, true)
    if (!user) {
      throw new NotFoundException(`Demo user "${username}" was not found.`)
    }

    const libraries = buildDemoLibraries(scale)
    const plan: DemoSeedPlan = {
      username,
      musicDir,
      libraries: libraries.map((lib) => ({ genre: lib.genre, artists: lib.artists.length, tracks: countTracks([lib]) })),
      plannedTracks: countTracks(libraries),
    }

    this.run(libraries, user, musicDir).catch((err) => this.logger.error(err))

    return plan
  }

  // Wipes prior data, writes the tree + covers, registers the Libraries, and
  // kicks off a reindex owned by the demo user.
  private async run(libraries: DemoLibrary[], user: User, musicDir: string): Promise<void> {
    this.logger.log('Demo seed: wiping existing indexed data + libraries...')
    await this.indexingService.deleteAllIndexedData()
    await this.clearLibrariesForUser(user)

    const sampleDir = resolveSampleDir()
    const sampleFiles = listSampleFiles(sampleDir)
    const ext = path.extname(sampleFiles[0]) || '.mp3'

    let written = 0
    const created: { name: string, path: string }[] = []

    for (const lib of libraries) {
      const genreDir = path.join(musicDir, sanitizeSegment(lib.dirName))
      // Start clean so re-runs don't accumulate stale folders on the mount.
      fs.rmSync(genreDir, { recursive: true, force: true })
      fs.mkdirSync(genreDir, { recursive: true })
      created.push({ name: lib.genre, path: genreDir })

      for (const artist of lib.artists) {
        const artistDir = path.join(genreDir, sanitizeSegment(artist.name))
        fs.mkdirSync(artistDir, { recursive: true })

        for (const album of artist.albums) {
          const albumDir = path.join(artistDir, sanitizeSegment(album.title))
          fs.mkdirSync(albumDir, { recursive: true })
          fs.writeFileSync(path.join(albumDir, 'cover.jpg'), await generateCover(artist.name, album.title))

          album.tracks.forEach((title, i) => {
            const num = (i + 1).toString().padStart(2, '0')
            const fileName = `${num} ${sanitizeSegment(title)}${ext}`
            const sample = sampleFiles[randomInt(0, sampleFiles.length - 1)]
            fs.copyFileSync(path.join(sampleDir, sample), path.join(albumDir, fileName))
            written++
          })
        }
      }

      this.logger.log(`Demo seed: wrote ${lib.genre} (${lib.artists.length} artists)`)
    }

    // One Library per genre, owned by the demo user so it's visible on login.
    for (const { name, path: libPath } of created) {
      await this.libraryService.createLibrary(name, user, [libPath])
    }

    this.logger.log(`Demo seed: wrote ${written} tracks; starting reindex as ${user.username}...`)
    await this.indexingService.start({
      user,
      runType: RunType.FULL,
      mediaTypes: { music: true, photos: false, movies: false, tv: false },
    })
    this.logger.log('Demo seed: reindex started.')
  }

  private async clearLibrariesForUser(user: User): Promise<void> {
    const existing = await this.libraryRepository.find({
      where: { user: { id: user.id } },
      relations: { user: true },
    })
    if (existing.length) {
      await this.libraryRepository.remove(existing)
    }
  }
}
