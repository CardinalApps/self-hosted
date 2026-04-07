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
  ['#0a0a0a', '#39ff14', '#00ffff'],
  ['#1c0a00', '#ff6d00', '#ffca3a'],
  ['#0d0221', '#6a00f4', '#8900f2'],
  ['#001219', '#005f73', '#94d2bd'],
  ['#10002b', '#e0aaff', '#c77dff'],
  ['#1a0000', '#e63946', '#f1faee'],
  ['#0b132b', '#1c3a8a', '#5bc0eb'],
  ['#1b1b2f', '#e43f5a', '#ffc300'],
  ['#141414', '#bb86fc', '#03dac6'],
  ['#0c1b33', '#f72585', '#7209b7'],
  ['#1d1e2c', '#a8dadc', '#457b9d'],
  ['#170a1c', '#da77ff', '#ffbe0b'],
  ['#0e1c36', '#2176ff', '#33a1fd'],
  ['#1a1423', '#f637ec', '#00b4d8'],
  ['#12100e', '#e8a838', '#c45113'],
  ['#031d27', '#06a77d', '#d5f2e3'],
  ['#1e0010', '#e01a4f', '#f15025'],
  ['#0f1923', '#00b2ca', '#1d4e89'],
  ['#16001e', '#9b5de5', '#f15bb5'],
  ['#070707', '#39d353', '#26a641'],
  ['#241734', '#ff499e', '#d264b6'],
  ['#001524', '#15616d', '#ffecd1'],
  ['#1c1c1e', '#ff9f1c', '#ffbf69'],
  ['#0d1321', '#748cab', '#f0ebd8'],
  ['#1a0a00', '#d4522a', '#f2a65a'],
  ['#050a0e', '#1282a2', '#034078'],
  ['#1b0000', '#e84855', '#f9dc5c'],
  ['#051923', '#003554', '#006494'],
  ['#12002f', '#7b2fff', '#ff6bff'],
  ['#0a1128', '#e63b2e', '#ffba49'],
  ['#001a23', '#00b4d8', '#caf0f8'],
  ['#1f0011', '#c9184a', '#ff4d6d'],
  ['#0a0908', '#22333b', '#c6ac8f'],
  ['#1b2021', '#52b788', '#d8f3dc'],
  ['#0e0e0e', '#ff006e', '#fb5607'],
  ['#1a1000', '#d4a017', '#f5cb5c'],
  ['#020c1b', '#64ffda', '#0a192f'],
  ['#160016', '#bf5af2', '#ff375f'],
  ['#001011', '#093a3e', '#3aafb9'],
  ['#1e0b00', '#ff7b00', '#ffaa00'],
  ['#0c0c1d', '#fffb96', '#e8a0bf'],
  ['#030027', '#2d00f7', '#6a00f4'],
  ['#0f1a20', '#3a7d44', '#9bc4cb'],
  ['#200122', '#6a0572', '#ab83a1'],
  ['#140c1c', '#442434', '#c2a2c2'],
  ['#011627', '#fdfffc', '#2ec4b6'],
  ['#17181a', '#e9c46a', '#2a9d8f'],
  ['#1b0000', '#9d0208', '#e85d04'],
  ['#020b18', '#0466c8', '#0353a4'],
  ['#151515', '#f72585', '#4361ee'],
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
