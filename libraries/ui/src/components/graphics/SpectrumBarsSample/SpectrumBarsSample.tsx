import { SpectrumBarsParams, SpectrumBarsRenderer } from './SpectrumBarsRenderer'
import VisualizerHarness from '../visualizerCore/VisualizerHarness'

export interface SpectrumBarsSampleProps {
  /** Number of bars, bass left to treble right (4-96). Default: 32 */
  barCount?: number
  /** Gap between bars as a fraction of the bar cell (0-0.8). Default: 0.3 */
  gap?: number
  /** Max bar height as a fraction of the canvas height. Default: 0.62 */
  maxHeight?: number
  /** Floor position as a fraction of the canvas height. Default: 0.26 */
  baseline?: number
  /** Bar corner rounding (0-1). Default: 0.6 */
  cornerRadius?: number
  /** Peak cap thickness in CSS pixels. Default: 2.5 */
  capThickness?: number
  /** Peak cap fall acceleration. Default: 2.2 */
  capGravity?: number
  /** Seconds a fresh peak holds before falling. Default: 0.22 */
  capHold?: number
  /** Wet-floor reflection strength (0-1). Default: 0.35 */
  reflection?: number
  /** Bass-side bar color */
  colorLow?: string
  /** Treble-side bar color */
  colorHigh?: string
  /** Peak cap color */
  colorCap?: string
  /** Palette rotation in degrees/sec. Default: 0 */
  hueDrift?: number
  /** Glow size and strength (0-1). Default: 0.45 */
  glow?: number
  /** Trail persistence per frame at 60fps (0-0.97). Default: 0.7 */
  trailDecay?: number
  /** Upward trail drift per frame at 60fps. Default: 0.002 */
  driftY?: number
  /** Tonemap exposure. Default: 1.4 */
  exposure?: number
  /** Analysis gain multiplier. Default: 1 */
  sensitivity?: number
}

const createRenderer = (canvas: HTMLCanvasElement) => new SpectrumBarsRenderer(canvas)

// Classic spectrum bar EQ, modernized: SDF bars with glow, gravity-falling peak caps,
// and a wet-floor reflection
export default function SpectrumBarsSample(props: SpectrumBarsSampleProps) {
  const params = buildParams(props)
  return <VisualizerHarness createRenderer={createRenderer} params={params} sensitivity={params.sensitivity} bands={3} />
}

// Merge props with defaults into the flat params object the render loop reads
function buildParams(props: SpectrumBarsSampleProps): SpectrumBarsParams {
  return {
    barCount: props.barCount ?? 32,
    gap: props.gap ?? 0.3,
    maxHeight: props.maxHeight ?? 0.62,
    baseline: props.baseline ?? 0.26,
    cornerRadius: props.cornerRadius ?? 0.6,
    capThickness: props.capThickness ?? 2.5,
    capGravity: props.capGravity ?? 2.2,
    capHold: props.capHold ?? 0.22,
    reflection: props.reflection ?? 0.35,
    colorLow: props.colorLow ?? '#ff3d81',
    colorHigh: props.colorHigh ?? '#2ee6ff',
    colorCap: props.colorCap ?? '#ffffff',
    hueDrift: props.hueDrift ?? 0,
    glow: props.glow ?? 0.45,
    trailDecay: props.trailDecay ?? 0.7,
    driftY: props.driftY ?? 0.002,
    exposure: props.exposure ?? 1.4,
    sensitivity: props.sensitivity ?? 1,
  }
}
