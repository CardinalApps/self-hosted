import { RadialWaveParams, RadialWaveRenderer } from './RadialWaveRenderer'
import VisualizerHarness from '../visualizerCore/VisualizerHarness'

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

const createRenderer = (canvas: HTMLCanvasElement) => new RadialWaveRenderer(canvas)

// Radial pulsating wave: concentric spectrum-deformed rings, one per frequency band
export default function RadialWaveSample(props: RadialWaveSampleProps) {
  const params = buildParams(props)
  return <VisualizerHarness createRenderer={createRenderer} params={params} sensitivity={params.sensitivity} bands={params.ringCount} />
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
