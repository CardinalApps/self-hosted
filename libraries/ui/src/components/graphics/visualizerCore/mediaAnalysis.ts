import { AnalysisFrame, createAnalysisFrame, fillIdleFrame, SpectrumProcessor } from './dsp'

/*
  One AudioContext for every tap, created on the first attach and never closed. Howler's own
  context is deliberately not reused: it auto-suspends after 30s whenever no Web Audio sound is
  playing, and since every stream here is an html5 sound, that suspend would take the analysis —
  and the routed audio with it — down mid-track.
*/
let ctx: AudioContext | null = null

/* createMediaElementSource can only be called once per element, and Howler recycles elements
   through its own pool, so both the source and its analyser are cached against the element. */
const taps = new WeakMap<HTMLMediaElement, AnalyserNode>()

// The analyser every visualizer reads: 4096 bins with just enough smoothing to stop the flicker
export const createAnalyser = (context: AudioContext): AnalyserNode => {
  const analyser = context.createAnalyser()
  analyser.fftSize = 4096
  analyser.smoothingTimeConstant = 0.5
  analyser.minDecibels = -85
  analyser.maxDecibels = -22
  return analyser
}

/*
  Route a media element through an analyser. Capturing an element is permanent — its audio can
  never go back to the default output — so this refuses to touch anything it cannot guarantee
  will still be audible afterwards: a stream fetched without CORS produces silence through Web
  Audio, and a context that will not start produces silence full stop.
*/
export const tapMediaElement = async (el: HTMLMediaElement): Promise<AnalyserNode | null> => {
  const cached = taps.get(el)
  if (cached) {
    return cached
  }

  if (!isAnalysable(el)) {
    return null
  }

  if (!ctx) {
    ctx = new AudioContext()
  }

  if (ctx.state !== 'running') {
    try {
      await ctx.resume()
    } catch {
      return null
    }
  }

  // Autoplay policy: without a user gesture behind it the context stays suspended
  if (ctx.state !== 'running') {
    return null
  }

  const analyser = createAnalyser(ctx)
  ctx.createMediaElementSource(el).connect(analyser).connect(ctx.destination)
  taps.set(el, analyser)
  return analyser
}

// Web Audio hands back silence for a cross-origin element that was not fetched with CORS
const isAnalysable = (el: HTMLMediaElement): boolean => {
  /* Howler hands back a GainNode instead of an element for its Web Audio sounds, and
     createMediaElementSource throws on one */
  if (!(el instanceof HTMLMediaElement)) {
    return false
  }
  if (el.crossOrigin) {
    return true
  }
  try {
    return new URL(el.currentSrc || el.src, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

/* Seconds between attempts to tap an element that is playing but not yet analysed. A visualizer
   restored from the store renders before anyone has clicked anything, and until they do the
   autoplay policy keeps the context suspended, so the first attempt is often not the one that
   lands. */
const RETRY_SECONDS = 1

/**
 * The analysis frames for one playing media element. Falls back to idle motion whenever the
 * element is paused, or has not been tapped yet.
 */
export class MediaElementAnalysis {
  private el: HTMLMediaElement | null = null
  private analyser: AnalyserNode | null = null
  private processor: SpectrumProcessor | null = null
  private freqData = new Uint8Array(0)
  private timeData = new Uint8Array(0)
  private pending = false
  private nextAttempt = 0
  private readonly frame = createAnalysisFrame()

  // Point the analysis at another element; the tap itself is left to the render loop
  attach(el: HTMLMediaElement | null): void {
    if (el === this.el) {
      return
    }
    this.el = el
    this.analyser = null
    this.processor = null
    this.nextAttempt = 0
  }

  // Sample the analyser and produce this frame's analysis
  update(dt: number, timeSec: number, sensitivity: number, bands: number): AnalysisFrame {
    if (!this.analyser || !this.processor) {
      this.tap(timeSec)
      return fillIdleFrame(this.frame, timeSec)
    }
    if (!this.el || this.el.paused) {
      return fillIdleFrame(this.frame, timeSec)
    }
    this.analyser.getByteFrequencyData(this.freqData)
    this.analyser.getByteTimeDomainData(this.timeData)
    const frame = this.processor.process(this.freqData, dt, sensitivity, bands)
    this.processor.processWave(this.timeData, dt, sensitivity)
    return frame
  }

  /* Only ever attempted against an element that is actually playing: audio cannot be playing
     without the gesture the context needs, so by then the tap has everything it will ever get. */
  private tap(timeSec: number): void {
    const el = this.el
    if (!el || el.paused || this.pending || timeSec < this.nextAttempt) {
      return
    }

    this.pending = true
    this.nextAttempt = timeSec + RETRY_SECONDS

    void tapMediaElement(el).then((analyser) => {
      this.pending = false

      // The element was swapped out while this attempt was waiting on the context
      if (this.el !== el || !analyser) {
        return
      }

      this.analyser = analyser
      this.freqData = new Uint8Array(analyser.frequencyBinCount)
      this.timeData = new Uint8Array(analyser.fftSize)
      this.processor = new SpectrumProcessor(analyser.context.sampleRate, analyser.fftSize)
    })
  }
}
