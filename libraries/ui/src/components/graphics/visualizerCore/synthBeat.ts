const BPM = 118
const STEPS_PER_BAR = 16
const STEP_DURATION = 60 / BPM / 4

/* Eighth-note bassline (Hz), indexed by eighth-note position within the bar */
const BASSLINE = [55, 55, 82.41, 55, 65.41, 55, 98, 73.42]
/* High plucks alternate between these on the bar's back half */
const PLUCKS = [1318.51, 1567.98]

// Self-contained four-on-the-floor beat so the visualizer demos with zero setup. Uses the
// standard Web Audio lookahead scheduler: a coarse timer queues sample-accurate events ahead.
export class SynthBeat {
  private readonly ctx: AudioContext
  private readonly out: GainNode
  private readonly noise: AudioBuffer
  private timer: number | null = null
  private nextTime = 0
  private step = 0

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx
    this.out = ctx.createGain()
    this.out.gain.value = 0.9
    this.out.connect(destination)
    this.noise = createNoiseBuffer(ctx)
  }

  // Begin scheduling steps ~120ms ahead of the clock
  start(): void {
    if (this.timer !== null) return
    this.nextTime = this.ctx.currentTime + 0.06
    this.timer = window.setInterval(() => {
      while (this.nextTime < this.ctx.currentTime + 0.12) {
        this.scheduleStep(this.step % STEPS_PER_BAR, this.nextTime)
        this.step++
        this.nextTime += STEP_DURATION
      }
    }, 25)
  }

  // Stop scheduling; already-queued notes ring out naturally
  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
  }

  get running(): boolean {
    return this.timer !== null
  }

  dispose(): void {
    this.stop()
    this.out.disconnect()
  }

  // One 16th-note step of the pattern
  private scheduleStep(s: number, t: number): void {
    if (s % 4 === 0) this.kick(t)
    if (s % 4 === 2) this.hat(t)
    if (s % 2 === 0) {
      /* Bass ducks under the kick — the fake sidechain makes the bass ring visibly pump */
      const gain = s % 4 === 0 ? 0.08 : 0.2
      this.bass(t, BASSLINE[(s / 2) % 8], gain)
    }
    if (s === 7 || s === 15) this.pluck(t, PLUCKS[(Math.floor(this.step / STEPS_PER_BAR) + s) % 2])
  }

  // Pitched-down sine thump
  private kick(t: number): void {
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.frequency.setValueAtTime(160, t)
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.11)
    g.gain.setValueAtTime(1, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24)
    osc.connect(g)
    g.connect(this.out)
    osc.start(t)
    osc.stop(t + 0.26)
  }

  // Short burst of highpassed noise
  private hat(t: number): void {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const hp = this.ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 7000
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.16, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    src.connect(hp)
    hp.connect(g)
    g.connect(this.out)
    src.start(t)
    src.stop(t + 0.06)
  }

  // Filtered saw bass note
  private bass(t: number, freq: number, gain: number): void {
    const osc = this.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const lp = this.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 6
    lp.frequency.setValueAtTime(500, t)
    lp.frequency.exponentialRampToValueAtTime(140, t + 0.18)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
    osc.connect(lp)
    lp.connect(g)
    g.connect(this.out)
    osc.start(t)
    osc.stop(t + 0.22)
  }

  // Bell-ish sine pluck for treble-ring sparkle
  private pluck(t: number, freq: number): void {
    const osc = this.ctx.createOscillator()
    osc.frequency.value = freq
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.12, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.connect(g)
    g.connect(this.out)
    osc.start(t)
    osc.stop(t + 0.32)
  }
}

// 200ms of reusable white noise
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}
