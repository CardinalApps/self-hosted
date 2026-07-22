import {
  AnalyzedWaveform,
  WaveformAnalyzer,
  WAVEFORM_SAMPLE_RATE,
  calculateBinTarget,
  parseEbur128Summary,
  quantizeWaveform,
} from './analysis'

// Builds mono s16le PCM of a sine wave
function sineBuffer(frequencyHz: number, seconds: number, amplitude = 1): Buffer {
  const samples = Math.round(seconds * WAVEFORM_SAMPLE_RATE)
  const buffer = Buffer.alloc(samples * 2)
  for (let i = 0; i < samples; i++) {
    const value = Math.round(amplitude * 32767 * Math.sin((2 * Math.PI * frequencyHz * i) / WAVEFORM_SAMPLE_RATE))
    buffer.writeInt16LE(value, i * 2)
  }
  return buffer
}

// Builds mono s16le PCM of digital silence
function silenceBuffer(seconds: number): Buffer {
  return Buffer.alloc(Math.round(seconds * WAVEFORM_SAMPLE_RATE) * 2)
}

// Average of an array
function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

// Decodes a quantized channel back to bytes
function decodeChannel(base64: string): number[] {
  return [...Buffer.from(base64, 'base64')]
}

describe('calculateBinTarget', () => {
  it('scales with duration between the clamps', () => {
    expect(calculateBinTarget(300)).toBe(1500)
  })

  it('clamps short tracks up to the minimum', () => {
    expect(calculateBinTarget(30)).toBe(600)
  })

  it('clamps long tracks down to the maximum', () => {
    expect(calculateBinTarget(7200)).toBe(2400)
  })

  it('falls back to a default when duration is unknown', () => {
    expect(calculateBinTarget(null)).toBe(1200)
    expect(calculateBinTarget(0)).toBe(1200)
  })
})

describe('WaveformAnalyzer', () => {
  it('bins a loud section between silence and measures the silence offsets', () => {
    const analyzer = new WaveformAnalyzer(6)
    analyzer.push(silenceBuffer(2))
    analyzer.push(sineBuffer(440, 2, 0.9))
    analyzer.push(silenceBuffer(2))
    const result = analyzer.finish()

    expect(result.binCount).toBeGreaterThanOrEqual(595)
    expect(result.binCount).toBeLessThanOrEqual(605)

    expect(result.silenceLeadIn).toBeCloseTo(2, 1)
    expect(result.silenceLeadOut).toBeCloseTo(2, 1)

    const third = Math.floor(result.binCount / 3)
    const silentBins = result.channels.rms.slice(0, third - 2)
    const loudBins = result.channels.rms.slice(third + 2, 2 * third - 2)
    const loudPeaks = result.channels.peak.slice(third + 2, 2 * third - 2)

    expect(Math.max(...silentBins)).toBeLessThan(0.01)
    // RMS of a 0.9-amplitude sine is 0.9 / sqrt(2)
    expect(mean(loudBins)).toBeCloseTo(0.636, 1)
    expect(mean(loudPeaks)).toBeCloseTo(0.9, 1)
  })

  it('produces identical results regardless of chunk sizes', () => {
    const pcm = Buffer.concat([silenceBuffer(0.5), sineBuffer(440, 1, 0.8), silenceBuffer(0.5)])

    const wholeAnalyzer = new WaveformAnalyzer(2)
    wholeAnalyzer.push(pcm)

    // Odd chunk size, so int16 frames straddle chunk boundaries
    const chunkedAnalyzer = new WaveformAnalyzer(2)
    for (let i = 0; i < pcm.length; i += 999) {
      chunkedAnalyzer.push(pcm.subarray(i, Math.min(i + 999, pcm.length)))
    }

    expect(chunkedAnalyzer.finish()).toEqual(wholeAnalyzer.finish())
  })

  it('puts a 100 Hz tone in the low band', () => {
    const analyzer = new WaveformAnalyzer(2)
    analyzer.push(sineBuffer(100, 2, 0.8))
    const { channels } = analyzer.finish()

    expect(mean(channels.low)).toBeGreaterThan(3 * mean(channels.mid))
    expect(mean(channels.low)).toBeGreaterThan(50 * mean(channels.high))
  })

  it('puts a 1 kHz tone in the mid band', () => {
    const analyzer = new WaveformAnalyzer(2)
    analyzer.push(sineBuffer(1000, 2, 0.8))
    const { channels } = analyzer.finish()

    expect(mean(channels.mid)).toBeGreaterThan(3 * mean(channels.low))
    expect(mean(channels.mid)).toBeGreaterThan(3 * mean(channels.high))
  })

  it('puts a 10 kHz tone in the high band', () => {
    const analyzer = new WaveformAnalyzer(2)
    analyzer.push(sineBuffer(10000, 2, 0.8))
    const { channels } = analyzer.finish()

    expect(mean(channels.high)).toBeGreaterThan(3 * mean(channels.mid))
    expect(mean(channels.high)).toBeGreaterThan(50 * mean(channels.low))
  })

  it('reports null silence offsets for a fully silent stream', () => {
    const analyzer = new WaveformAnalyzer(2)
    analyzer.push(silenceBuffer(2))
    const result = analyzer.finish()

    expect(result.silenceLeadIn).toBeNull()
    expect(result.silenceLeadOut).toBeNull()
  })
})

describe('quantizeWaveform', () => {
  const analyzed = (channels: Partial<AnalyzedWaveform['channels']>): AnalyzedWaveform => ({
    binCount: 4,
    channels: {
      peak: [0, 0.25, 0.5, 1],
      rms: [0, 0.25, 0.5, 1],
      low: [0.5],
      mid: [0.25],
      high: [0.1],
      ...channels,
    },
    silenceLeadIn: null,
    silenceLeadOut: null,
  })

  it('quantizes linearly against the channel scale', () => {
    const { channels, scales } = quantizeWaveform(analyzed({}))

    expect(scales.peak).toBe(1)
    expect(decodeChannel(channels.peak)).toEqual([0, 64, 128, 255])
  })

  it('normalizes to the 98th percentile so an outlier cannot flatten the wave', () => {
    const rms = [...Array(99).fill(0.1), 1]
    const { channels, scales } = quantizeWaveform(analyzed({ rms }))

    expect(scales.rms).toBeCloseTo(0.1, 5)
    const decoded = decodeChannel(channels.rms)
    expect(decoded.slice(0, 99).every((byte) => byte === 255)).toBe(true)
    // The outlier clamps instead of stretching the scale
    expect(decoded[99]).toBe(255)
  })

  it('shares one scale across the three band channels', () => {
    const { channels, scales } = quantizeWaveform(analyzed({}))

    expect(scales.bands).toBe(0.5)
    expect(decodeChannel(channels.low)).toEqual([255])
    expect(decodeChannel(channels.mid)).toEqual([128])
    expect(decodeChannel(channels.high)).toEqual([51])
  })
})

describe('parseEbur128Summary', () => {
  // Captured from a real ffmpeg run; includes a per-frame line before the summary
  const realStderr = `
[Parsed_ebur128_3 @ 0x7fc6000193c0] t: 6.999977   TARGET:-23 LUFS    M:  -nan S: -24.0     I: -22.5 LUFS       LRA:   1.5 LU  FTPK:  -inf dBFS  TPK: -18.5 dBFS
[Parsed_ebur128_3 @ 0x7fc6000193c0] Summary:

  Integrated loudness:
    I:         -22.5 LUFS
    Threshold: -32.5 LUFS

  Loudness range:
    LRA:         1.5 LU
    Threshold: -42.6 LUFS
    LRA low:   -23.8 LUFS
    LRA high:  -22.2 LUFS

  True peak:
    Peak:      -18.5 dBFS
`

  it('parses integrated loudness and true peak from the summary', () => {
    expect(parseEbur128Summary(realStderr)).toEqual({
      integratedLufs: -22.5,
      truePeakDb: -18.5,
    })
  })

  it('returns nulls when there is no summary', () => {
    expect(parseEbur128Summary('ffmpeg exploded before finishing')).toEqual({
      integratedLufs: null,
      truePeakDb: null,
    })
  })

  it('returns null for non-finite values from silent audio', () => {
    const silentSummary = `Summary:

  Integrated loudness:
    I:         -70.0 LUFS

  True peak:
    Peak:      -inf dBFS
`
    expect(parseEbur128Summary(silentSummary)).toEqual({
      integratedLufs: -70,
      truePeakDb: null,
    })
  })
})
