import type { MusicTrackWaveformType } from '../../../store/apis/musicTracks'

/*
  Pure canvas painting for the waveform scrubber. Everything here is plain
  functions of (data, options) so the look can be tuned in one place and the
  drawing can be reused outside the Scrubber (e.g. future sparklines).
*/

// Perceptual lift applied at decode time; the server stores linear values
const DISPLAY_GAMMA = 0.65

// Quiet-but-not-silent audio still renders as a visible hairline (css px)
const MIN_ENVELOPE_PX = 1

// One envelope point per this many css px; fewer points = smoother wave
const PX_PER_POINT = 3

export type RGB = {
  r: number,
  g: number,
  b: number,
}

export type WaveformPalette = {
  low: RGB,
  mid: RGB,
  high: RGB,
  halo: RGB,
  haloAlpha: number,
  depthAlpha: number,
}

export type DecodedWaveform = {
  binCount: number,
  peak: Float32Array,
  rms: Float32Array,
  low: Float32Array,
  mid: Float32Array,
  high: Float32Array,
}

// Decodes one base64 channel to floats in 0..1
function decodeChannel(base64: string, gamma: number): Float32Array {
  const raw = atob(base64)
  const values = new Float32Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    values[i] = (raw.charCodeAt(i) / 255) ** gamma
  }
  return values
}

/**
 * Decodes the API waveform payload into display-ready channel arrays. The
 * peak/rms envelopes get a gamma lift for visual contrast; the band channels
 * stay linear because they only drive color mixing.
 */
export function decodeWaveform(waveform: MusicTrackWaveformType): DecodedWaveform {
  return {
    binCount: waveform.binCount,
    peak: decodeChannel(waveform.data.channels.peak, DISPLAY_GAMMA),
    rms: decodeChannel(waveform.data.channels.rms, DISPLAY_GAMMA),
    low: decodeChannel(waveform.data.channels.low, 1),
    mid: decodeChannel(waveform.data.channels.mid, 1),
    high: decodeChannel(waveform.data.channels.high, 1),
  }
}

// Parses #rgb, #rrggbb, and rgb()/rgba() strings
export function parseColor(color: string): RGB | null {
  const trimmed = color.trim()

  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1]
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    }
  }

  const rgb = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) }
  }

  return null
}

// Linear blend between two colors
function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  }
}

const BLACK: RGB = { r: 8, g: 8, b: 16 }
const WHITE: RGB = { r: 255, g: 255, b: 255 }
const GRAY: RGB = { r: 128, g: 128, b: 128 }

/**
 * Builds the vivid (played) and dim (unplayed) palettes from a base color —
 * the dominant cover color when available, the accent color otherwise. The
 * bands form a tonal ramp of the base: lows darker, highs brighter.
 */
export function deriveWaveformPalettes(tintColors: string[] | undefined, accentColor: string): {
  vivid: WaveformPalette,
  dim: WaveformPalette,
} {
  const base = (tintColors?.map(parseColor).find(Boolean))
    ?? parseColor(accentColor)
    ?? { r: 120, g: 120, b: 200 }

  const vivid: WaveformPalette = {
    low: mix(base, BLACK, 0.48),
    mid: base,
    high: mix(base, WHITE, 0.68),
    halo: mix(base, WHITE, 0.7),
    haloAlpha: 0.3,
    depthAlpha: 0.22,
  }

  const dim: WaveformPalette = {
    low: mix(vivid.low, GRAY, 0.72),
    mid: mix(vivid.mid, GRAY, 0.72),
    high: mix(vivid.high, GRAY, 0.72),
    halo: mix(vivid.halo, GRAY, 0.72),
    haloAlpha: 0.06,
    depthAlpha: 0.08,
  }

  return { vivid, dim }
}

// Averages a channel down to n points
function resample(values: Float32Array, n: number): Float32Array {
  if (values.length <= n) {
    return values
  }
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const start = Math.floor((i / n) * values.length)
    const end = Math.max(start + 1, Math.floor(((i + 1) / n) * values.length))
    let sum = 0
    for (let j = start; j < end; j++) {
      sum += values[j]
    }
    out[i] = sum / (end - start)
  }
  return out
}

/*
  Builds a closed, vertically mirrored envelope path through the points using
  Catmull-Rom splines converted to cubic béziers — this is what makes the wave
  continuous instead of bars.
*/
function envelopePath(
  ctx: CanvasRenderingContext2D,
  points: Float32Array,
  width: number,
  height: number,
  minPx: number,
): void {
  const n = points.length
  const midY = height / 2
  const half = height / 2

  const xAt = (i: number) => (i / (n - 1)) * width
  const yAt = (i: number, sign: 1 | -1) => {
    const v = Math.max(points[i] * half, minPx)
    return midY + sign * v
  }

  const edge = (sign: 1 | -1) => {
    const from = sign === -1 ? 0 : n - 1
    const to = sign === -1 ? n - 1 : 0
    const step = sign === -1 ? 1 : -1
    for (let i = from; i !== to; i += step) {
      const iPrev = Math.min(Math.max(i - step, 0), n - 1)
      const iNext = i + step
      const iAfter = Math.min(Math.max(iNext + step, 0), n - 1)
      const c1x = xAt(i) + (xAt(iNext) - xAt(iPrev)) / 6
      const c1y = yAt(i, sign) + (yAt(iNext, sign) - yAt(iPrev, sign)) / 6
      const c2x = xAt(iNext) - (xAt(iAfter) - xAt(i)) / 6
      const c2y = yAt(iNext, sign) - (yAt(iAfter, sign) - yAt(i, sign)) / 6
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, xAt(iNext), yAt(iNext, sign))
    }
  }

  ctx.beginPath()
  ctx.moveTo(0, yAt(0, -1))
  edge(-1)
  ctx.lineTo(width, yAt(n - 1, 1))
  edge(1)
  ctx.closePath()
}

/**
 * Draws the full static wave (body fill, frequency wash, depth gradient, and
 * peak halo) onto a canvas. Coordinates are css px; scale the context for
 * devicePixelRatio before calling.
 */
export function drawWaveformWave(
  ctx: CanvasRenderingContext2D,
  decoded: DecodedWaveform,
  width: number,
  height: number,
  palette: WaveformPalette,
): void {
  const n = Math.max(2, Math.min(decoded.binCount, Math.floor(width / PX_PER_POINT)))
  const rms = resample(decoded.rms, n)
  const peak = resample(decoded.peak, n)
  const low = resample(decoded.low, n)
  const mid = resample(decoded.mid, n)
  const high = resample(decoded.high, n)

  // Frequency wash: one pixel per point, stretched across the wave with
  // image smoothing so the band colors blend into a continuous gradient
  const strip = document.createElement('canvas')
  strip.width = n
  strip.height = 1
  const stripCtx = strip.getContext('2d')
  for (let i = 0; i < n; i++) {
    const sum = low[i] + mid[i] + high[i]
    let color = palette.mid
    if (sum > 0.001) {
      const wLow = low[i] / sum
      const wMid = mid[i] / sum
      const wHigh = high[i] / sum
      color = {
        r: palette.low.r * wLow + palette.mid.r * wMid + palette.high.r * wHigh,
        g: palette.low.g * wLow + palette.mid.g * wMid + palette.high.g * wHigh,
        b: palette.low.b * wLow + palette.mid.b * wMid + palette.high.b * wHigh,
      }
    }
    stripCtx.fillStyle = `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`
    stripCtx.fillRect(i, 0, 1, 1)
  }

  ctx.save()
  envelopePath(ctx, rms, width, height, MIN_ENVELOPE_PX)
  ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(strip, 0, 0, n, 1, 0, 0, width, height)

  // Depth: brightest along the center line, fading toward the envelope edges
  const depth = ctx.createLinearGradient(0, 0, 0, height)
  depth.addColorStop(0, 'rgba(255, 255, 255, 0)')
  depth.addColorStop(0.5, `rgba(255, 255, 255, ${palette.depthAlpha})`)
  depth.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = depth
  ctx.fillRect(0, 0, width, height)
  ctx.restore()

  // Peak halo: a thin line floating outside the body, carrying the transients
  ctx.save()
  envelopePath(ctx, peak, width, height, MIN_ENVELOPE_PX)
  ctx.strokeStyle = `rgba(${Math.round(palette.halo.r)}, ${Math.round(palette.halo.g)}, ${Math.round(palette.halo.b)}, ${palette.haloAlpha})`
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

/**
 * Composites the prerendered dim and vivid waves onto the visible canvas:
 * dim everywhere, a faint vivid strip for the buffered range, full vivid up
 * to the playhead. All x values are css px.
 */
export function compositeWaveform(
  ctx: CanvasRenderingContext2D,
  dimCanvas: HTMLCanvasElement,
  vividCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  progressX: number,
  bufferedX: number,
): void {
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(dimCanvas, 0, 0, width, height)

  if (bufferedX > progressX) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(progressX, 0, bufferedX - progressX, height)
    ctx.clip()
    ctx.globalAlpha = 0.3
    ctx.drawImage(vividCanvas, 0, 0, width, height)
    ctx.restore()
  }

  if (progressX > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, progressX, height)
    ctx.clip()
    ctx.drawImage(vividCanvas, 0, 0, width, height)
    ctx.restore()
  }
}
