import { SynthwaveParams, SynthwaveRenderer } from './SynthwaveRenderer'
import VisualizerHarness from '../visualizerCore/VisualizerHarness'

export interface SynthwaveSampleProps {
  /** Wave height as a fraction of half the canvas height. Default: 0.45 */
  amp?: number
  /** Vertical position of the line, -0.5 (bottom) to 0.5 (top). Default: 0 */
  yPos?: number
  /** Core stroke half-width in CSS pixels. Default: 1.5 */
  lineWidth?: number
  /** Glow size and strength (0-1). Default: 0.55 */
  glow?: number
  /** Ghost lines behind the main one (0-4). Default: 2 */
  ghosts?: number
  /** Electric arc displacement amplitude (0-0.6). Default: 0.3 */
  arcAmp?: number
  /** Arc noise frequency along the line. Default: 9 */
  arcFreq?: number
  /** Arc noise scroll speed. Default: 1.1 */
  arcSpeed?: number
  /** Main line color */
  colorA?: string
  /** Ghost line color */
  colorB?: string
  /** Palette rotation in degrees/sec. Default: 0 */
  hueDrift?: number
  /** Trail persistence per frame at 60fps (0-0.97). Default: 0.8 */
  trailDecay?: number
  /** Vertical trail dissipation per frame at 60fps. Default: 0.007 */
  smearY?: number
  /** Horizontal trail wind, -1..1. Default: 0 */
  driftX?: number
  /** Chromatic aberration (0-1). Default: 0.35 */
  chroma?: number
  /** Scanline strength (0-1). Default: 0.2 */
  scanlines?: number
  /** Tonemap exposure. Default: 1.4 */
  exposure?: number
  /** Analysis gain multiplier. Default: 1 */
  sensitivity?: number
}

const createRenderer = (canvas: HTMLCanvasElement) => new SynthwaveRenderer(canvas)

// Synthwave lightning: a phase-locked oscilloscope line whose electric arcs leap on treble
// transients, with phosphor trails and a CRT present pass
export default function SynthwaveSample(props: SynthwaveSampleProps) {
  const params = buildParams(props)
  return <VisualizerHarness createRenderer={createRenderer} params={params} sensitivity={params.sensitivity} bands={3} />
}

// Merge props with defaults into the flat params object the render loop reads
function buildParams(props: SynthwaveSampleProps): SynthwaveParams {
  return {
    amp: props.amp ?? 0.45,
    yPos: props.yPos ?? 0,
    lineWidth: props.lineWidth ?? 1.5,
    glow: props.glow ?? 0.55,
    ghosts: props.ghosts ?? 2,
    arcAmp: props.arcAmp ?? 0.3,
    arcFreq: props.arcFreq ?? 9,
    arcSpeed: props.arcSpeed ?? 1.1,
    colorA: props.colorA ?? '#2ee6ff',
    colorB: props.colorB ?? '#ff3da5',
    hueDrift: props.hueDrift ?? 0,
    trailDecay: props.trailDecay ?? 0.8,
    smearY: props.smearY ?? 0.007,
    driftX: props.driftX ?? 0,
    chroma: props.chroma ?? 0.35,
    scanlines: props.scanlines ?? 0.2,
    exposure: props.exposure ?? 1.4,
    sensitivity: props.sensitivity ?? 1,
  }
}
