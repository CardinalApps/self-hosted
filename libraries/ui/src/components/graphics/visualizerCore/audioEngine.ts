import { AnalysisFrame, createAnalysisFrame, fillIdleFrame, SpectrumProcessor } from './dsp'
import { createAnalyser } from './mediaAnalysis'
import { SynthBeat } from './synthBeat'

export type AudioSourceKind = 'none' | 'file' | 'synth'

// Owns the Web Audio graph: (file element | synth) -> master gain -> analyser -> speakers.
// The analyser is sampled inside the render loop every frame, so audio and pixels cannot drift.
export class VisualizerAudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private freqData = new Uint8Array(0)
  private timeData = new Uint8Array(0)
  private processor: SpectrumProcessor | null = null
  private element: HTMLAudioElement | null = null
  private objectUrl: string | null = null
  private synth: SynthBeat | null = null

  private readonly idleFrame: AnalysisFrame = createAnalysisFrame()

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
  update(dt: number, timeSec: number, sensitivity: number, bands: number): AnalysisFrame {
    if (!this.analyser || !this.processor || !this.playing) return fillIdleFrame(this.idleFrame, timeSec)
    this.analyser.getByteFrequencyData(this.freqData)
    this.analyser.getByteTimeDomainData(this.timeData)
    const frame = this.processor.process(this.freqData, dt, sensitivity, bands)
    this.processor.processWave(this.timeData, dt, sensitivity)
    return frame
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
    this.analyser = createAnalyser(this.ctx)
    this.master.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount)
    this.timeData = new Uint8Array(this.analyser.fftSize)
    this.processor = new SpectrumProcessor(this.ctx.sampleRate, this.analyser.fftSize)
    return this.ctx
  }
}
