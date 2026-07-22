import { EchoTunnelParams, EchoTunnelRenderer } from './EchoTunnelRenderer'
import VisualizerHarness from '../visualizerCore/VisualizerHarness'

export interface EchoTunnelSampleProps {
  /** Injected ring radius as a fraction of the half-min-dimension. Default: 0.4 */
  ringRadius?: number
  /** Ring stroke half-width in CSS pixels. Default: 2 */
  ringWidth?: number
  /** Waveform deformation of the ring. Default: 0.16 */
  waveAmp?: number
  /** Glow size and strength (0-1). Default: 0.5 */
  glow?: number
  /** Base ring color */
  color?: string
  /** Ring hue rotation in degrees/sec — the tunnel's rainbow layers. Default: 24 */
  hueCycle?: number
  /** Outward echo growth per frame at 60fps. Default: 0.01 */
  zoom?: number
  /** Extra growth per unit of bass — the kick pumps the tunnel. Default: 0.022 */
  bassZoom?: number
  /** Base tunnel rotation in radians/sec. Default: 0.1 */
  spin?: number
  /** Extra rotation per unit of mid energy. Default: 0.6 */
  midSpin?: number
  /** Liquid ripple displacement (0-0.05). Default: 0.012 */
  rippleAmp?: number
  /** Ripple frequency along the radius. Default: 15 */
  rippleFreq?: number
  /** Ripple speed; treble accelerates it. Default: 2.2 */
  rippleSpeed?: number
  /** Echo persistence per frame at 60fps (0-0.96). Default: 0.93 */
  trailDecay?: number
  /** Tonemap exposure. Default: 1.3 */
  exposure?: number
  /** Analysis gain multiplier. Default: 1 */
  sensitivity?: number
}

const createRenderer = (canvas: HTMLCanvasElement) => new EchoTunnelRenderer(canvas)

// Milkdrop-style echo tunnel: a single waveform ring injected per frame, echoed forever through
// a music-driven polar warp — bass pumps the zoom, mids steer the spin, treble drives the ripple
export default function EchoTunnelSample(props: EchoTunnelSampleProps) {
  const params = buildParams(props)
  return <VisualizerHarness createRenderer={createRenderer} params={params} sensitivity={params.sensitivity} bands={3} />
}

// Merge props with defaults into the flat params object the render loop reads
function buildParams(props: EchoTunnelSampleProps): EchoTunnelParams {
  return {
    ringRadius: props.ringRadius ?? 0.4,
    ringWidth: props.ringWidth ?? 2,
    waveAmp: props.waveAmp ?? 0.16,
    glow: props.glow ?? 0.5,
    color: props.color ?? '#2ee6ff',
    hueCycle: props.hueCycle ?? 24,
    zoom: props.zoom ?? 0.01,
    bassZoom: props.bassZoom ?? 0.022,
    spin: props.spin ?? 0.1,
    midSpin: props.midSpin ?? 0.6,
    rippleAmp: props.rippleAmp ?? 0.012,
    rippleFreq: props.rippleFreq ?? 15,
    rippleSpeed: props.rippleSpeed ?? 2.2,
    trailDecay: props.trailDecay ?? 0.93,
    exposure: props.exposure ?? 1.3,
    sensitivity: props.sensitivity ?? 1,
  }
}
