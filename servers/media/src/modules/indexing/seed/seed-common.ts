import * as fs from 'fs'
import * as path from 'path'
import * as sharp from 'sharp'

/*
 * Shared helpers for the kiosk seed services (filesystem seed + demo seed).
 * Kept framework-free so both services and their unit tests can import them.
 */

const COVER_SIZE = 500

// [background, foreground, accent] triplets used to give every album a distinct
// generated cover. Chosen by a stable hash of the album so re-seeding is stable.
export const PALETTE: [string, string, string][] = [
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
['#241734', '#ff499e', '#d264b6'],
  ['#001524', '#15616d', '#ffecd1'],
['#0d1321', '#748cab', '#f0ebd8'],
  ['#051923', '#003554', '#006494'],
['#12002f', '#7b2fff', '#ff6bff'],
  ['#001a23', '#00b4d8', '#caf0f8'],
['#0a0908', '#22333b', '#c6ac8f'],
  ['#0e0e0e', '#ff006e', '#fb5607'],
['#020c1b', '#64ffda', '#0a192f'],
  ['#160016', '#bf5af2', '#ff375f'],
['#011627', '#fdfffc', '#2ec4b6'],
]

// Deterministic 32-bit string hash (FNV-1a), used to pick a stable palette.
export function hashString(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Strips characters that are illegal in SMB/Azure Files path segments so the
// generated tree can be written to the mounted /music share.
export function sanitizeSegment(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim()
}

// Renders a 500x500 JPEG album cover. Palette is chosen from a stable hash of
// the artist + release so a given album always gets the same look.
export async function generateCover(artistName: string, releaseName: string): Promise<Buffer> {
  const [bg, fg, accent] = PALETTE[hashString(`${artistName}::${releaseName}`) % PALETTE.length]
  const [br, bg2, bb] = hexToRgb(bg)
  const S = COVER_SIZE
  const halfH = Math.floor(S * 0.45)

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

// Resolves the bundled sample-music directory. In the packaged (yao-pkg) binary
// the `public/**/*` assets live in the virtual snapshot next to dist/, so the
// __dirname-relative path resolves there; a couple of fallbacks cover dev/test.
export function resolveSampleDir(): string {
  const candidates = [
    path.join(__dirname, '../../../../public/static/sample-music'),
    path.join(__dirname, '../../../public/static/sample-music'),
    path.join(process.cwd(), 'public/static/sample-music'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate
    }
  }

  throw new Error(`Could not locate the bundled sample-music directory. Tried: ${candidates.join(', ')}`)
}

// Lists the playable sample files inside the sample-music directory.
export function listSampleFiles(sampleDir: string): string[] {
  const files = fs.readdirSync(sampleDir).filter((f) => fs.statSync(path.join(sampleDir, f)).isFile())
  if (files.length === 0) {
    throw new Error(`No sample files found in ${sampleDir}`)
  }
  return files
}
