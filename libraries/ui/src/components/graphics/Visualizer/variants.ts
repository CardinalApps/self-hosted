import { EchoTunnelParams, EchoTunnelRenderer } from '../EchoTunnelSample/EchoTunnelRenderer'
import { RadialWaveParams, RadialWaveRenderer } from '../RadialWaveSample/RadialWaveRenderer'
import { SpectrumBarsParams, SpectrumBarsRenderer } from '../SpectrumBarsSample/SpectrumBarsRenderer'
import { SynthwaveParams, SynthwaveRenderer } from '../SynthwaveSample/SynthwaveRenderer'
import { VisualizerRenderer } from '../visualizerCore/renderer'

/* The cycle order, and the values persisted in the store. Appending is free; renaming is not, so
   a stored name that no longer exists has to be treated as "no visualizer" by whoever reads it. */
export const VISUALIZER_VARIANTS = ['spectrum-bars', 'synthwave', 'echo-tunnel', 'radial-wave'] as const

export type VisualizerVariant = typeof VISUALIZER_VARIANTS[number]

export type VisualizerVariantDef = {
  createRenderer: (canvas: HTMLCanvasElement) => VisualizerRenderer<unknown>
  params: unknown
  /* Frequency bands the DSP splits its pulses into, matched to what the renderer reads */
  bands: number
  sensitivity: number
}

/* Each variant carries its own params rather than the renderer's, so the registry can hold all
   four behind one type while each entry stays checked against the renderer it belongs to. */
const define = <P>(def: {
  createRenderer: (canvas: HTMLCanvasElement) => VisualizerRenderer<P>,
  params: P,
  bands: number,
  sensitivity: number,
}): VisualizerVariantDef => def as VisualizerVariantDef

/*
  Tuned for the sidebar's square, which is a fraction of the width the samples were designed
  against: fewer, fatter bars, and trails pulled back so the small canvas doesn't smear into a
  solid block.
*/
export const VISUALIZER_VARIANT_DEFS: Record<VisualizerVariant, VisualizerVariantDef> = {
  'radial-wave': define<RadialWaveParams>({
    createRenderer: (canvas) => new RadialWaveRenderer(canvas),
    bands: 3,
    sensitivity: 1,
    params: {
      ringCount: 3,
      colors: ['#ff3d81', '#2ee6ff', '#ffd166', '#8b5cf6', '#34d399'],
      lineWidth: 2,
      glow: 0.5,
      pulseAmp: 0.22,
      dispAmp: 0.13,
      symmetry: 1,
      trailDecay: 0.8,
      trailZoom: 0.006,
      trailSpin: 0.18,
      hueDrift: 2,
      exposure: 1.4,
      sensitivity: 1,
    },
  }),
  'spectrum-bars': define<SpectrumBarsParams>({
    createRenderer: (canvas) => new SpectrumBarsRenderer(canvas),
    bands: 3,
    sensitivity: 1,
    params: {
      barCount: 24,
      gap: 0.32,
      maxHeight: 0.6,
      baseline: 0.28,
      cornerRadius: 0.6,
      capThickness: 2.5,
      capGravity: 2.2,
      capHold: 0.22,
      reflection: 0.35,
      colorLow: '#ff3d81',
      colorHigh: '#2ee6ff',
      colorCap: '#ffffff',
      hueDrift: 0,
      glow: 0.45,
      trailDecay: 0.66,
      driftY: 0.002,
      exposure: 1.4,
      sensitivity: 1,
    },
  }),
  synthwave: define<SynthwaveParams>({
    createRenderer: (canvas) => new SynthwaveRenderer(canvas),
    bands: 3,
    sensitivity: 1,
    params: {
      amp: 0.4,
      yPos: 0,
      lineWidth: 1.5,
      glow: 0.55,
      ghosts: 2,
      arcAmp: 0.3,
      arcFreq: 7,
      arcSpeed: 1.1,
      colorA: '#2ee6ff',
      colorB: '#ff3da5',
      hueDrift: 0,
      trailDecay: 0.78,
      smearY: 0.007,
      driftX: 0,
      chroma: 0.35,
      scanlines: 0.2,
      exposure: 1.4,
      sensitivity: 1,
    },
  }),
  'echo-tunnel': define<EchoTunnelParams>({
    createRenderer: (canvas) => new EchoTunnelRenderer(canvas),
    bands: 3,
    sensitivity: 1,
    params: {
      ringRadius: 0.4,
      ringWidth: 2,
      waveAmp: 0.16,
      glow: 0.5,
      color: '#2ee6ff',
      hueCycle: 24,
      zoom: 0.012,
      bassZoom: 0.022,
      spin: 0.1,
      midSpin: 0.6,
      rippleAmp: 0.012,
      rippleFreq: 15,
      rippleSpeed: 2.2,
      trailDecay: 0.92,
      exposure: 1.3,
      sensitivity: 1,
    },
  }),
}

// The variant after this one, wrapping back to null (no visualizer) past the last
export const nextVisualizerVariant = (variant: VisualizerVariant | null): VisualizerVariant | null => {
  if (variant === null) {
    return VISUALIZER_VARIANTS[0]
  }
  return VISUALIZER_VARIANTS[VISUALIZER_VARIANTS.indexOf(variant) + 1] ?? null
}

// Narrows a persisted value, which can be anything a previous version wrote
export const asVisualizerVariant = (value: unknown): VisualizerVariant | null => (
  VISUALIZER_VARIANTS.includes(value as VisualizerVariant) ? value as VisualizerVariant : null
)
