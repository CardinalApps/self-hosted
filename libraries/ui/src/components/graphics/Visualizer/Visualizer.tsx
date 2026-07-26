import { useEffect, useRef } from 'react'
import clsx from 'clsx'

import { MediaElementAnalysis } from '../visualizerCore/mediaAnalysis'
import { VisualizerRenderer } from '../visualizerCore/renderer'

import { VISUALIZER_VARIANT_DEFS, VisualizerVariant } from './variants'

import './Visualizer.css'

/* Seconds of rendering before the visualizer calls itself ready. One frame is enough to have
   pixels, but the trail-based variants spend their first few frames nearly black, and the whole
   point of announcing readiness is to let a caller reveal something that is already moving. */
const WARMUP_SECONDS = 0.25

type VisualizerProps = {
  variant: VisualizerVariant,
  // The element whose audio drives the analysis. Without one the visualizer runs on idle motion.
  mediaElement?: HTMLMediaElement | null,
  className?: string,
  // Fired once, after the canvas has been rendering long enough to be worth showing
  onReady?: () => void,
  // Fired when the canvas cannot render at all, so the caller can show something else
  onError?: () => void,
}

/**
 * An audio visualizer: a WebGL2 canvas that fills its container and animates to whatever the
 * given media element is playing.
 */
const Visualizer = ({ variant, mediaElement, className, onReady, onError }: VisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analysisRef = useRef<MediaElementAnalysis>(null)
  const onReadyRef = useRef(onReady)
  const onErrorRef = useRef(onError)

  if (!analysisRef.current) {
    analysisRef.current = new MediaElementAnalysis()
  }

  onReadyRef.current = onReady
  onErrorRef.current = onError

  useEffect(() => {
    analysisRef.current?.attach(mediaElement ?? null)
  }, [mediaElement])

  useEffect(() => {
    const canvas = canvasRef.current
    const analysis = analysisRef.current
    if (!canvas || !analysis) {
      return
    }

    const def = VISUALIZER_VARIANT_DEFS[variant]

    let renderer: VisualizerRenderer<unknown>
    try {
      renderer = def.createRenderer(canvas)
    } catch {
      onErrorRef.current?.()
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
    let warmth = 0
    let ready = false

    const loop = (now: DOMHighResTimeStamp) => {
      raf = requestAnimationFrame(loop)
      /* clamp dt so a background-tab gap doesn't slingshot the envelopes and trails */
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
      last = now
      const frame = analysis.update(dt, now / 1000, def.sensitivity, def.bands)
      renderer.render(frame, def.params, now / 1000, dt)

      if (!ready && size.w > 0) {
        warmth += dt
        if (warmth >= WARMUP_SECONDS) {
          ready = true
          onReadyRef.current?.()
        }
      }
    }
    raf = requestAnimationFrame(loop)

    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
    }
    const onRestored = () => {
      renderer.dispose()
      renderer = def.createRenderer(canvas)
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
    }
  }, [variant])

  return <canvas ref={canvasRef} className={clsx('visualizer', className)} />
}

export default Visualizer
