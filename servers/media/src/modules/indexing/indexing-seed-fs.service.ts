import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'

import { getMediaDirs } from '../../utils/env'
import { generateCover, resolveSampleDir, listSampleFiles, sanitizeSegment, randomInt } from './seed/seed-common'

// Falls back to a temp dir when no music dir is configured (e.g. dev without a
// mount); in the container this resolves to the mounted /music share.
function defaultOutputDir(): string {
  return getMediaDirs().music ?? path.join(process.cwd(), '.seed-music')
}

function generateName(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: ' ',
    style: 'capital',
    length: 2,
  })
}

/*
 * Writes a random mock music tree (artists / albums / covers / sample audio) to
 * disk so the indexer has something to scan. This is the simple load-testing
 * seed; the curated public-demo dataset lives in IndexingSeedDemoService.
 */
@Injectable()
export class IndexingSeedFsService {
  private readonly logger = new Logger(IndexingSeedFsService.name)

  seed(artistCount: number, outputDir: string = defaultOutputDir()): void {
    this.runSeed(artistCount, outputDir).catch((err) => this.logger.error(err))
  }

  private async runSeed(artistCount: number, outputDir: string): Promise<void> {
    const sampleDir = resolveSampleDir()
    const sampleFiles = listSampleFiles(sampleDir)

    fs.mkdirSync(outputDir, { recursive: true })

    let totalTracks = 0

    for (let a = 0; a < artistCount; a++) {
      const artistName = generateName()
      const artistDir = path.join(outputDir, sanitizeSegment(artistName))
      fs.mkdirSync(artistDir, { recursive: true })

      const releaseCount = randomInt(1, 10)

      for (let r = 0; r < releaseCount; r++) {
        const releaseName = generateName()
        const releaseDir = path.join(artistDir, sanitizeSegment(releaseName))
        fs.mkdirSync(releaseDir, { recursive: true })

        fs.writeFileSync(path.join(releaseDir, 'cover.jpg'), await generateCover(artistName, releaseName))

        const trackCount = randomInt(1, 10)

        for (let t = 0; t < trackCount; t++) {
          const sampleFile = sampleFiles[randomInt(0, sampleFiles.length - 1)]
          const ext = path.extname(sampleFile)
          const trackName = `${(t + 1).toString().padStart(2, '0')} ${sanitizeSegment(generateName())}${ext}`
          fs.copyFileSync(path.join(sampleDir, sampleFile), path.join(releaseDir, trackName))
          totalTracks++
        }
      }

      this.logger.log(`Created artist ${a + 1}/${artistCount}: ${artistName} (${releaseCount} releases)`)
    }

    this.logger.log(`Done. Created ${artistCount} artists and ${totalTracks} tracks in ${outputDir}`)
  }
}
