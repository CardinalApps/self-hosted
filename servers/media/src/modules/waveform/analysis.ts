/**
 * Pure waveform analysis math. Everything in this file operates on plain
 * numbers/buffers so it can be unit tested without ffmpeg or the database.
 */

// Bump this when the data format or analysis algorithm changes in a way that
// requires regeneration. The generate_waveforms job re-enqueues any track whose
// stored waveform has a lower version.
export const WAVEFORM_VERSION = 1

export const WAVEFORM_SAMPLE_RATE = 44100

// Target visual resolution: ~5 bins per second, clamped so short tracks still
// get a detailed wave and multi-hour files stay small.
const BINS_PER_SECOND = 5
const MIN_BINS = 600
const MAX_BINS = 2400

// Backstop for streams much longer than the metadata duration claimed
// (corrupt files, bad tags). Once reached, the final bin absorbs the rest.
const HARD_MAX_BINS = 6000

// Assumed length when the track has no duration metadata.
const FALLBACK_DURATION_SECONDS = 240

// -60 dBFS; below this a sample counts as silence.
const SILENCE_THRESHOLD = 0.001

// Band crossover points for the frequency-tinted rendering.
const LOW_CROSSOVER_HZ = 250
const HIGH_CROSSOVER_HZ = 4000

export type WaveformChannelName = 'peak' | 'rms' | 'low' | 'mid' | 'high'

export type AnalyzedWaveform = {
  binCount: number,
  // Linear values in 0..1 (fraction of int16 full scale), one entry per bin
  channels: Record<WaveformChannelName, number[]>,
  silenceLeadIn: number | null,
  silenceLeadOut: number | null,
}

export type QuantizedWaveformData = {
  // Base64-encoded Uint8 arrays, one byte per bin
  channels: Record<WaveformChannelName, string>,
  // Linear value that quantized byte 255 maps back to, per channel group
  scales: {
    peak: number,
    rms: number,
    bands: number,
  },
}

/**
 * Direct form 1 biquad filter using RBJ audio EQ cookbook coefficients.
 */
export class Biquad {
  private b0: number
  private b1: number
  private b2: number
  private a1: number
  private a2: number
  private x1 = 0
  private x2 = 0
  private y1 = 0
  private y2 = 0

  private constructor(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number) {
    this.b0 = b0 / a0
    this.b1 = b1 / a0
    this.b2 = b2 / a0
    this.a1 = a1 / a0
    this.a2 = a2 / a0
  }

  /**
   * Creates a second order low-pass filter.
   */
  static lowpass(cutoffHz: number, sampleRate: number, q = Math.SQRT1_2): Biquad {
    const w0 = 2 * Math.PI * (cutoffHz / sampleRate)
    const alpha = Math.sin(w0) / (2 * q)
    const cosW0 = Math.cos(w0)
    return new Biquad(
      (1 - cosW0) / 2,
      1 - cosW0,
      (1 - cosW0) / 2,
      1 + alpha,
      -2 * cosW0,
      1 - alpha,
    )
  }

  /**
   * Creates a second order high-pass filter.
   */
  static highpass(cutoffHz: number, sampleRate: number, q = Math.SQRT1_2): Biquad {
    const w0 = 2 * Math.PI * (cutoffHz / sampleRate)
    const alpha = Math.sin(w0) / (2 * q)
    const cosW0 = Math.cos(w0)
    return new Biquad(
      (1 + cosW0) / 2,
      -(1 + cosW0),
      (1 + cosW0) / 2,
      1 + alpha,
      -2 * cosW0,
      1 - alpha,
    )
  }

  /**
   * Processes one sample.
   */
  process(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}

/**
 * Returns the number of bins to aim for given a track duration.
 */
export function calculateBinTarget(durationSeconds: number | null | undefined): number {
  const duration = durationSeconds && durationSeconds > 0 ? durationSeconds : FALLBACK_DURATION_SECONDS
  return Math.min(MAX_BINS, Math.max(MIN_BINS, Math.round(duration * BINS_PER_SECOND)))
}

/**
 * Streaming analyzer for mono s16le PCM. Feed it decoded audio with push()
 * as chunks arrive, then call finish() once for the result.
 */
export class WaveformAnalyzer {
  private samplesPerBin: number
  private leftoverByte: Buffer | null = null

  private lowFilter = Biquad.lowpass(LOW_CROSSOVER_HZ, WAVEFORM_SAMPLE_RATE)
  private midHighpass = Biquad.highpass(LOW_CROSSOVER_HZ, WAVEFORM_SAMPLE_RATE)
  private midLowpass = Biquad.lowpass(HIGH_CROSSOVER_HZ, WAVEFORM_SAMPLE_RATE)
  private highFilter = Biquad.highpass(HIGH_CROSSOVER_HZ, WAVEFORM_SAMPLE_RATE)

  private totalSamples = 0
  private firstLoudSample: number | null = null
  private lastLoudSample: number | null = null

  private binSamples = 0
  private binPeak = 0
  private binSumSq = 0
  private binLowSumSq = 0
  private binMidSumSq = 0
  private binHighSumSq = 0

  private peaks: number[] = []
  private rms: number[] = []
  private low: number[] = []
  private mid: number[] = []
  private high: number[] = []

  constructor(durationSeconds: number | null | undefined) {
    const duration = durationSeconds && durationSeconds > 0 ? durationSeconds : FALLBACK_DURATION_SECONDS
    const totalSamples = duration * WAVEFORM_SAMPLE_RATE
    this.samplesPerBin = Math.max(1, Math.round(totalSamples / calculateBinTarget(durationSeconds)))
  }

  /**
   * Consumes a chunk of mono s16le PCM.
   */
  push(chunk: Buffer): void {
    let buffer = chunk

    if (this.leftoverByte) {
      buffer = Buffer.concat([this.leftoverByte, chunk])
      this.leftoverByte = null
    }

    const usableBytes = buffer.length - (buffer.length % 2)

    for (let i = 0; i < usableBytes; i += 2) {
      this.pushSample(buffer.readInt16LE(i) / 32768)
    }

    if (usableBytes < buffer.length) {
      this.leftoverByte = buffer.subarray(usableBytes)
    }
  }

  /**
   * Analyzes one sample in the -1..1 range.
   */
  private pushSample(sample: number): void {
    const abs = Math.abs(sample)

    if (abs > SILENCE_THRESHOLD) {
      if (this.firstLoudSample === null) {
        this.firstLoudSample = this.totalSamples
      }
      this.lastLoudSample = this.totalSamples
    }

    if (abs > this.binPeak) {
      this.binPeak = abs
    }
    this.binSumSq += sample * sample

    const low = this.lowFilter.process(sample)
    const mid = this.midLowpass.process(this.midHighpass.process(sample))
    const high = this.highFilter.process(sample)
    this.binLowSumSq += low * low
    this.binMidSumSq += mid * mid
    this.binHighSumSq += high * high

    this.totalSamples++
    this.binSamples++

    if (this.binSamples >= this.samplesPerBin && this.peaks.length < HARD_MAX_BINS - 1) {
      this.flushBin()
    }
  }

  /**
   * Closes the current bin and starts a new one.
   */
  private flushBin(): void {
    const n = this.binSamples
    this.peaks.push(this.binPeak)
    this.rms.push(Math.sqrt(this.binSumSq / n))
    this.low.push(Math.sqrt(this.binLowSumSq / n))
    this.mid.push(Math.sqrt(this.binMidSumSq / n))
    this.high.push(Math.sqrt(this.binHighSumSq / n))

    this.binSamples = 0
    this.binPeak = 0
    this.binSumSq = 0
    this.binLowSumSq = 0
    this.binMidSumSq = 0
    this.binHighSumSq = 0
  }

  /**
   * Finalizes the analysis and returns the raw (unquantized) result.
   */
  finish(): AnalyzedWaveform {
    if (this.binSamples > 0) {
      this.flushBin()
    }

    const round = (seconds: number) => Math.round(seconds * 1000) / 1000

    return {
      binCount: this.peaks.length,
      channels: {
        peak: this.peaks,
        rms: this.rms,
        low: this.low,
        mid: this.mid,
        high: this.high,
      },
      silenceLeadIn: this.firstLoudSample === null
        ? null
        : round(this.firstLoudSample / WAVEFORM_SAMPLE_RATE),
      silenceLeadOut: this.lastLoudSample === null
        ? null
        : round((this.totalSamples - 1 - this.lastLoudSample) / WAVEFORM_SAMPLE_RATE),
    }
  }
}

/**
 * Returns the value at the given percentile (0..1) of the array.
 */
export function percentile(values: number[], p: number): number {
  if (!values.length) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(p * (sorted.length - 1)))
  return sorted[index]
}

/**
 * Quantizes analyzed channels to base64-encoded Uint8 arrays.
 *
 * Peak and RMS are normalized independently to their own 98th percentile so
 * one stray transient can't flatten the whole wave. The three band channels
 * share a single scale so their relative balance (which drives the frequency
 * coloring) is preserved.
 */
export function quantizeWaveform(analyzed: AnalyzedWaveform): QuantizedWaveformData {
  const { peak, rms, low, mid, high } = analyzed.channels

  const scaleFloor = 0.0001
  const peakScale = Math.max(percentile(peak, 0.98), scaleFloor)
  const rmsScale = Math.max(percentile(rms, 0.98), scaleFloor)
  const bandsScale = Math.max(
    percentile(low, 0.98),
    percentile(mid, 0.98),
    percentile(high, 0.98),
    scaleFloor,
  )

  const encode = (values: number[], scale: number): string => {
    const bytes = new Uint8Array(values.length)
    for (let i = 0; i < values.length; i++) {
      bytes[i] = Math.min(255, Math.max(0, Math.round((values[i] / scale) * 255)))
    }
    return Buffer.from(bytes).toString('base64')
  }

  return {
    channels: {
      peak: encode(peak, peakScale),
      rms: encode(rms, rmsScale),
      low: encode(low, bandsScale),
      mid: encode(mid, bandsScale),
      high: encode(high, bandsScale),
    },
    scales: {
      peak: peakScale,
      rms: rmsScale,
      bands: bandsScale,
    },
  }
}

/**
 * Extracts integrated loudness and true peak from the summary that ffmpeg's
 * ebur128 filter prints to stderr at the end of a run. Returns nulls when the
 * summary is missing or a value is not a finite number (e.g. "-inf" for a
 * fully silent file).
 */
export function parseEbur128Summary(stderr: string): { integratedLufs: number | null, truePeakDb: number | null } {
  const summaryStart = stderr.lastIndexOf('Summary:')

  if (summaryStart === -1) {
    return { integratedLufs: null, truePeakDb: null }
  }

  const summary = stderr.slice(summaryStart)
  const toFinite = (match: RegExpMatchArray | null): number | null => {
    if (!match) {
      return null
    }
    const value = Number(match[1])
    return Number.isFinite(value) ? value : null
  }

  return {
    integratedLufs: toFinite(summary.match(/I:\s+(-?[\d.]+|-?inf|nan)\s+LUFS/)),
    truePeakDb: toFinite(summary.match(/Peak:\s+(-?[\d.]+|-?inf|nan)\s+dBFS/)),
  }
}
