import { CSSProperties, ChangeEvent, useEffect, useRef, useState } from 'react'

import { VisualizerAudioEngine, AudioSourceKind } from './audioEngine'
import { RadialWaveParams, RadialWaveRenderer } from './RadialWaveRenderer'

export interface RadialWaveSampleProps {
  /** Number of rings, innermost = bass (1-5). Default: 3 */
  ringCount?: number
  /** Ring colors, innermost first */
  colorBass?: string
  colorMid?: string
  colorTreble?: string
  colorFour?: string
  colorFive?: string
  /** Core stroke half-width in CSS pixels. Default: 2 */
  lineWidth?: number
  /** Glow size and strength (0-1). Default: 0.5 */
  glow?: number
  /** How far rings expand on their band's energy (0-0.6). Default: 0.22 */
  pulseAmp?: number
  /** Amplitude of the spectrum deformation around each ring (0-0.5). Default: 0.13 */
  dispAmp?: number
  /** Mirrored wedges; 1 = classic left/right mirror, 3+ = mandala. Default: 1 */
  symmetry?: number
  /** Trail persistence per frame at 60fps (0-0.97). Default: 0.82 */
  trailDecay?: number
  /** Outward trail drift per frame at 60fps. Default: 0.006 */
  trailZoom?: number
  /** Trail swirl in radians/sec. Default: 0.18 */
  trailSpin?: number
  /** Palette rotation in degrees/sec. Default: 2 */
  hueDrift?: number
  /** Tonemap exposure. Default: 1.4 */
  exposure?: number
  /** Analysis gain multiplier. Default: 1 */
  sensitivity?: number
}

// Sample harness for the radial wave visualizer: canvas + rAF loop + demo audio controls.
// React only mounts and forwards config — every per-frame value lives in refs, never state.
export default function RadialWaveSample(props: RadialWaveSampleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fpsRef = useRef<HTMLSpanElement>(null)
  const engineRef = useRef<VisualizerAudioEngine | null>(null)
  const paramsRef = useRef<RadialWaveParams>(buildParams(props))
  const [status, setStatus] = useState('Pick a track or start the synth beat')
  const [source, setSource] = useState<AudioSourceKind>('none')
  const [playing, setPlaying] = useState(false)
  const [glError, setGlError] = useState<string | null>(null)

  paramsRef.current = buildParams(props)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new VisualizerAudioEngine()
    engineRef.current = engine

    let renderer: RadialWaveRenderer
    try {
      renderer = new RadialWaveRenderer(canvas)
    } catch {
      setGlError('WebGL2 is not available in this browser')
      engineRef.current = null
      return
    }

    /* device-pixel-content-box maps the backing store 1:1 to physical pixels — no fractional-DPR
       shimmer. contentRect * devicePixelRatio is the fallback for browsers without it. */
    const size = { w: 0, h: 0 }
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      const dpx = entry.devicePixelContentBoxSize?.[0]
      size.w = dpx ? dpx.inlineSize : Math.round(entry.contentRect.width * devicePixelRatio)
      size.h = dpx ? dpx.blockSize : Math.round(entry.contentRect.height * devicePixelRatio)
      renderer.resize(size.w, size.h)
    })
    ro.observe(canvas)

    let raf = 0
    let last = performance.now()
    let fpsFrames = 0
    let fpsElapsed = 0
    let cpuMs = 0

    const loop = (now: DOMHighResTimeStamp) => {
      raf = requestAnimationFrame(loop)
      const t0 = performance.now()
      /* clamp dt so a background-tab gap doesn't slingshot the envelopes and trails */
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
      last = now
      const params = paramsRef.current
      const frame = engine.update(dt, now / 1000, params.sensitivity, params.ringCount)
      renderer.render(frame, params, now / 1000, dt)

      cpuMs += performance.now() - t0
      fpsFrames++
      fpsElapsed += dt
      if (fpsElapsed >= 0.5 && fpsRef.current) {
        const fps = Math.round(fpsFrames / fpsElapsed)
        fpsRef.current.textContent = `${fps} fps · ${(cpuMs / fpsFrames).toFixed(1)} ms · ${size.w}×${size.h}`
        fpsFrames = 0
        fpsElapsed = 0
        cpuMs = 0
      }
    }
    raf = requestAnimationFrame(loop)

    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
    }
    const onRestored = () => {
      renderer.dispose()
      renderer = new RadialWaveRenderer(canvas)
      renderer.resize(size.w, size.h)
      raf = requestAnimationFrame(loop)
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      renderer.dispose()
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  // Load a local track fully client-side (object URL, nothing uploaded)
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !engineRef.current) return
    await engineRef.current.playFile(file)
    setStatus(file.name)
    setSource('file')
    setPlaying(true)
  }

  const onSynth = async () => {
    if (!engineRef.current) return
    await engineRef.current.playSynth()
    setStatus('Synth beat · 118 BPM')
    setSource('synth')
    setPlaying(true)
  }

  const onToggle = () => {
    if (!engineRef.current) return
    engineRef.current.toggle()
    setPlaying(engineRef.current.playing)
  }

  if (glError) {
    return <div style={{ padding: 24, color: '#f66' }}>{glError}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#04050a', borderRadius: 10, overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
        <span ref={fpsRef} style={fpsStyle} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={buttonStyle}>
          Load audio file
          <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={onFile} />
        </label>
        <button type="button" style={buttonStyle} onClick={onSynth}>
          Synth beat
        </button>
        <button type="button" style={{ ...buttonStyle, opacity: source === 'none' ? 0.4 : 1 }} onClick={onToggle} disabled={source === 'none'}>
          {playing ? 'Pause' : 'Resume'}
        </button>
        <span style={{ fontSize: 13, opacity: 0.7 }}>{status}</span>
      </div>
    </div>
  )
}

const buttonStyle: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid rgba(128, 128, 160, 0.35)',
  background: 'rgba(128, 128, 160, 0.12)',
  color: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
}

const fpsStyle: CSSProperties = {
  position: 'absolute',
  top: 10,
  right: 12,
  fontFamily: 'monospace',
  fontSize: 11,
  color: 'rgba(255, 255, 255, 0.45)',
  pointerEvents: 'none',
}

// Merge props with defaults into the flat params object the render loop reads
function buildParams(props: RadialWaveSampleProps): RadialWaveParams {
  return {
    ringCount: Math.max(1, Math.min(5, props.ringCount ?? 3)),
    colors: [
      props.colorBass ?? '#ff3d81',
      props.colorMid ?? '#2ee6ff',
      props.colorTreble ?? '#ffd166',
      props.colorFour ?? '#8b5cf6',
      props.colorFive ?? '#34d399',
    ],
    lineWidth: props.lineWidth ?? 2,
    glow: props.glow ?? 0.5,
    pulseAmp: props.pulseAmp ?? 0.22,
    dispAmp: props.dispAmp ?? 0.13,
    symmetry: props.symmetry ?? 1,
    trailDecay: props.trailDecay ?? 0.82,
    trailZoom: props.trailZoom ?? 0.006,
    trailSpin: props.trailSpin ?? 0.18,
    hueDrift: props.hueDrift ?? 2,
    exposure: props.exposure ?? 1.4,
    sensitivity: props.sensitivity ?? 1,
  }
}
