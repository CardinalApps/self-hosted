export const BIN_COUNT = 96
export const TEX_WIDTH = 32
export const MAX_RINGS = 5

export interface AnalysisFrame {
  /* Log-spaced spectrum, 0..1, envelope-smoothed and auto-gained */
  spectrum: Float32Array
  /* Per-ring band energy envelopes, 0..1 */
  pulses: Float32Array
  loudness: number
}

// Turns raw FFT snapshots into a stable, musical-feeling analysis frame. All buffers are
// preallocated; process() performs zero allocations so the render loop never triggers GC.
export class SpectrumProcessor {
  private readonly binRanges: Array<[number, number]> = []
  private readonly raw = new Float32Array(BIN_COUNT)
  private readonly smoothed = new Float32Array(BIN_COUNT)
  private readonly env = new Float32Array(BIN_COUNT)
  private peak = 0.25

  readonly frame: AnalysisFrame = {
    spectrum: new Float32Array(BIN_COUNT),
    pulses: new Float32Array(MAX_RINGS),
    loudness: 0,
  }

  constructor(sampleRate: number, fftSize: number) {
    /* Map each of the BIN_COUNT log-spaced bins (32Hz..15kHz) to a range of linear FFT indices,
       so low frequencies get fine resolution and highs get aggregated — matches pitch perception */
    const fMin = 32
    const fMax = Math.min(15000, sampleRate / 2)
    const hzPerIndex = sampleRate / fftSize
    for (let b = 0; b < BIN_COUNT; b++) {
      const lo = fMin * Math.pow(fMax / fMin, b / BIN_COUNT)
      const hi = fMin * Math.pow(fMax / fMin, (b + 1) / BIN_COUNT)
      const i0 = Math.max(1, Math.floor(lo / hzPerIndex))
      const i1 = Math.max(i0 + 1, Math.ceil(hi / hzPerIndex))
      this.binRanges.push([i0, i1])
    }
  }

  // Convert one FFT snapshot into the smoothed spectrum + per-ring pulses for this frame
  process(freq: Uint8Array, dt: number, sensitivity: number, ringCount: number): AnalysisFrame {
    const { raw, smoothed, env, frame } = this

    // collapse FFT indices into log bins; max (not mean) so narrow peaks aren't diluted
    let frameMax = 0
    for (let b = 0; b < BIN_COUNT; b++) {
      const [i0, i1] = this.binRanges[b]
      let v = 0
      for (let i = i0; i < i1 && i < freq.length; i++) v = Math.max(v, freq[i])
      raw[b] = v / 255
      frameMax = Math.max(frameMax, raw[b])
    }

    // slow-decay running peak gives auto-gain: quiet tracks stay alive, loud ones don't peg
    this.peak = Math.max(0.25, frameMax, this.peak * Math.exp(-dt / 4))
    const gain = sensitivity / this.peak

    /* Spatial 1-2-1 smoothing removes comb spikes between adjacent bins. The tilt compensates
       music's natural bass dominance so mid/treble rings get equal visual energy */
    for (let b = 0; b < BIN_COUNT; b++) {
      const l = raw[Math.max(0, b - 1)]
      const r = raw[Math.min(BIN_COUNT - 1, b + 1)]
      const tilt = 0.65 + 0.85 * (b / BIN_COUNT)
      smoothed[b] = (l + raw[b] * 2 + r) * 0.25 * gain * tilt
    }

    // fast-attack / slow-release envelope per bin is what makes motion feel musical, not nervous
    const atk = 1 - Math.exp(-dt / 0.02)
    const rel = 1 - Math.exp(-dt / 0.14)
    let sum = 0
    for (let b = 0; b < BIN_COUNT; b++) {
      const x = Math.min(1, smoothed[b])
      env[b] += (x - env[b]) * (x > env[b] ? atk : rel)
      frame.spectrum[b] = env[b]
      sum += env[b]
    }
    frame.loudness = sum / BIN_COUNT

    // per-ring pulse: mean energy of the ring's slice, peak-held with a musical release
    const pulseRel = Math.exp(-dt / 0.22)
    const per = BIN_COUNT / ringCount
    for (let ring = 0; ring < MAX_RINGS; ring++) {
      if (ring >= ringCount) {
        frame.pulses[ring] = 0
        continue
      }
      const start = Math.floor(ring * per)
      const end = Math.floor((ring + 1) * per)
      let e = 0
      for (let b = start; b < end; b++) e += env[b]
      e = Math.min(1, (e / (end - start)) * 1.35)
      /* smoothstep contrast curve: hits pop toward 1, the floor sinks — no constant pegging */
      e = e * e * (3 - 2 * e)
      frame.pulses[ring] = Math.max(e, frame.pulses[ring] * pulseRel)
    }

    return frame
  }
}
