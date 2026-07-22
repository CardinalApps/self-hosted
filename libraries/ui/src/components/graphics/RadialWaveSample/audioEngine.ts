import { AnalysisFrame, BIN_COUNT, MAX_RINGS, SpectrumProcessor } from './dsp'
import { SynthBeat } from './synthBeat'

export type AudioSourceKind = 'none' | 'file' | 'synth'

// Owns the Web Audio graph: (file element | synth) -> master gain -> analyser -> speakers.
// The analyser is sampled inside the render loop every frame, so audio and pixels cannot drift.
export class VisualizerAudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private freqData = new Uint8Array(0)
  private processor: SpectrumProcessor | null = null
  private element: HTMLAudioElement | null = null
  private objectUrl: string | null = null
  private synth: SynthBeat | null = null

  private readonly idleFrame: AnalysisFrame = {
    spectrum: new Float32Array(BIN_COUNT),
    pulses: new Float32Array(MAX_RINGS),
    loudness: 0,
  }

  source: AudioSourceKind = 'none'
  playing = false

  // Play a local file entirely client-side via an object URL (nothing is uploaded anywhere)
  async playFile(file: File): Promise<void> {
    const ctx = this.ensureContext()
    await ctx.resume()
    this.synth?.stop()
    if (!this.element) {
      /* createMediaElementSource is one-time-per-element, so a single element is reused across files */
      this.element = new Audio()
      this.element.loop = true
      ctx.createMediaElementSource(this.element).connect(this.master as GainNode)
    }
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
    this.objectUrl = URL.createObjectURL(file)
    this.element.src = this.objectUrl
    await this.element.play()
    this.source = 'file'
    this.playing = true
  }

  // Start the built-in synthesized beat
  async playSynth(): Promise<void> {
    const ctx = this.ensureContext()
    await ctx.resume()
    this.element?.pause()
    if (!this.synth) this.synth = new SynthBeat(ctx, this.master as GainNode)
    this.synth.start()
    this.source = 'synth'
    this.playing = true
  }

  // Pause or resume whichever source is active
  toggle(): void {
    if (this.source === 'file' && this.element) {
      if (this.playing) this.element.pause()
      else void this.element.play()
      this.playing = !this.playing
    } else if (this.source === 'synth' && this.synth) {
      if (this.playing) this.synth.stop()
      else this.synth.start()
      this.playing = !this.playing
    }
  }

  // Sample the analyser and produce this frame's analysis; gentle idle motion when silent
  update(dt: number, timeSec: number, sensitivity: number, ringCount: number): AnalysisFrame {
    if (!this.analyser || !this.processor || !this.playing) return this.idle(timeSec)
    this.analyser.getByteFrequencyData(this.freqData)
    return this.processor.process(this.freqData, dt, sensitivity, ringCount)
  }

  dispose(): void {
    this.synth?.dispose()
    this.element?.pause()
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
    void this.ctx?.close()
    this.ctx = null
  }

  // Lazily build the audio graph — must first run inside a user gesture (autoplay policy)
  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 4096
    this.analyser.smoothingTimeConstant = 0.5
    this.analyser.minDecibels = -85
    this.analyser.maxDecibels = -22
    this.master.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount)
    this.processor = new SpectrumProcessor(this.ctx.sampleRate, this.analyser.fftSize)
    return this.ctx
  }

  // Slow breathing so the rings feel alive before any audio starts
  private idle(t: number): AnalysisFrame {
    const f = this.idleFrame
    for (let b = 0; b < BIN_COUNT; b++) {
      f.spectrum[b] = 0.05 + 0.045 * (0.5 + 0.5 * Math.sin(t * 1.3 + b * 0.33))
    }
    for (let i = 0; i < MAX_RINGS; i++) {
      f.pulses[i] = 0.08 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 1.7))
    }
    f.loudness = 0.06
    return f
  }
}
