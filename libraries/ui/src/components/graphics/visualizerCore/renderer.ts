import { AnalysisFrame } from './dsp'

/* Every visualizer is a plain class behind this interface: React owns the canvas element and the
   config, the renderer owns the GL resources and is driven one frame at a time. */
export interface VisualizerRenderer<P> {
  resize(w: number, h: number): void
  render(frame: AnalysisFrame, params: P, timeSec: number, dt: number): void
  dispose(): void
}
