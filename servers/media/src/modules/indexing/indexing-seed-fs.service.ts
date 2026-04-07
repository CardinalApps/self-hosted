import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import * as sharp from 'sharp'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'

const SAMPLE_MUSIC_DIR = path.join(__dirname, '../../../public/static/sample-music')
const OUTPUT_DIR = '/home/brian/Music/TESTW'

const COVER_SIZE = 500
const PALETTE: [string, string, string][] = [
  ['#1a1a2e', '#e94560', '#f5a623'],
  ['#0f3460', '#533483', '#e94560'],
  ['#16213e', '#0f3460', '#48cae4'],
  ['#2b2d42', '#ef233c', '#f8961e'],
  ['#212529', '#4361ee', '#4cc9f0'],
  ['#1b4332', '#74c69d', '#b7e4c7'],
  ['#3d0000', '#ff6b6b', '#ffd166'],
  ['#1a0533', '#c77dff', '#ff9ef5'],
  ['#0d1b2a', '#e9c46a', '#f4a261'],
  ['#2d3a4a', '#48cae4', '#90e0ef'],
]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPalette(): [string, string, string] {
  return PALETTE[randomInt(0, PALETTE.length - 1)]
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

async function generateCover(artistName: string, releaseName: string): Promise<Buffer> {
  const [bg, fg, accent] = randomPalette()
  const [br, bg2, bb] = hexToRgb(bg)
  const halfH = Math.floor(COVER_SIZE * 0.45)
  const S = COVER_SIZE

  const svg = `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="${fg}" stop-opacity="0.35"/>
      </linearGradient>
    </defs>
    <rect width="${S}" height="${S}" fill="url(#bg)"/>
    <circle cx="${S * 0.72}" cy="${S * 0.32}" r="${S * 0.28}" fill="${accent}" opacity="0.18"/>
    <circle cx="${S * 0.72}" cy="${S * 0.32}" r="${S * 0.18}" fill="${accent}" opacity="0.22"/>
    <rect y="${S - halfH}" width="${S}" height="${halfH}" fill="${fg}" opacity="0.2"/>
    <line x1="40" y1="${S - halfH}" x2="${S - 40}" y2="${S - halfH}" stroke="${accent}" stroke-width="2" opacity="0.9"/>
    <text x="40" y="${S - halfH - 22}" font-family="sans-serif" font-size="22" font-weight="bold" fill="${fg}">${escapeXml(artistName)}</text>
    <text x="40" y="${S - halfH + 34}" font-family="sans-serif" font-size="18" fill="white" opacity="0.75">${escapeXml(releaseName)}</text>
    <rect x="40" y="40" width="60" height="6" fill="${accent}" opacity="0.9" rx="3"/>
    <rect x="40" y="56" width="40" height="6" fill="${fg}" opacity="0.5" rx="3"/>
  </svg>`

  return sharp(Buffer.from(svg))
    .flatten({ background: { r: br, g: bg2, b: bb } })
    .jpeg({ quality: 98, chromaSubsampling: '4:4:4' })
    .toBuffer()
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function generateName(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: ' ',
    style: 'capital',
    length: 2,
  })
}

@Injectable()
export class IndexingSeedFsService {
  private readonly logger = new Logger(IndexingSeedFsService.name)

  seed(artistCount: number): void {
    this.runSeed(artistCount).catch((err) => this.logger.error(err))
  }

  private async runSeed(artistCount: number): Promise<void> {
    const sampleFiles = fs.readdirSync(SAMPLE_MUSIC_DIR).filter((f) => fs.statSync(path.join(SAMPLE_MUSIC_DIR, f)).isFile())

    if (sampleFiles.length === 0) {
      throw new Error(`No sample files found in ${SAMPLE_MUSIC_DIR}`)
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true })

    let totalTracks = 0

    for (let a = 0; a < artistCount; a++) {
      const artistName = generateName()
      const artistDir = path.join(OUTPUT_DIR, artistName)
      fs.mkdirSync(artistDir, { recursive: true })

      const releaseCount = randomInt(1, 10)

      for (let r = 0; r < releaseCount; r++) {
        const releaseName = generateName()
        const releaseDir = path.join(artistDir, releaseName)
        fs.mkdirSync(releaseDir, { recursive: true })

        fs.writeFileSync(path.join(releaseDir, 'cover.jpg'), await generateCover(artistName, releaseName))

        const trackCount = randomInt(1, 10)

        for (let t = 0; t < trackCount; t++) {
          const sampleFile = sampleFiles[randomInt(0, sampleFiles.length - 1)]
          const ext = path.extname(sampleFile)
          const trackName = `${(t + 1).toString().padStart(2, '0')} ${generateName()}${ext}`
          fs.copyFileSync(path.join(SAMPLE_MUSIC_DIR, sampleFile), path.join(releaseDir, trackName))
          totalTracks++
        }
      }

      this.logger.log(`Created artist ${a + 1}/${artistCount}: ${artistName} (${releaseCount} releases)`)
    }

    this.logger.log(`Done. Created ${artistCount} artists and ${totalTracks} tracks in ${OUTPUT_DIR}`)
  }
}
